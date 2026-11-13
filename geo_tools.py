"""Загрузка и упрощение GeoJSON для карты мира.

Исходные файлы тяжёлые (countries.geojson ≈ 24 МБ, ADM1 России — десятки МБ) и на телефоне не загружались.
Здесь они скачиваются с нескольких зеркал, фильтруются, упрощаются (Дуглас — Пекер) и кешируются на диск.
"""
import json
import math
import os
import re
import tempfile
from urllib.request import Request, urlopen

CACHE_DIR = os.environ.get("MAP_CACHE_DIR") or os.path.join(tempfile.gettempdir(), "novaria_map_cache")

SOURCES = {
    "world": {
        "urls": [
            "https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson",
            "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
        ],
        "tol": 0.18, "digits": 2, "min_area": 0.05,
    },
    "ukraine": {
        "urls": [
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson",
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson",
        ],
        "tol": 0.03, "digits": 3, "min_area": 0.0,
        # для карты нужны только области, входящие в Новарию
        "keep": re.compile(r"odes|mykola|kherson|zaporiz|donetsk|luhansk|kharkiv|dnipro|crimea|sevastopol|одес|микол|херсон|запор|донец|луган|харк|дніпр|крим", re.I),
    },
    "russia": {
        "urls": [
            "https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/RUS/ADM1/geoBoundaries-RUS-ADM1.geojson",
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/RUS/ADM1/geoBoundaries-RUS-ADM1.geojson",
        ],
        "tol": 0.03, "digits": 3, "min_area": 0.0,
        "keep": re.compile(r"belgorod|белгород", re.I),
    },
}


def _perp(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))


def dp(points, tol):
    """Дуглас — Пекер без рекурсии."""
    n = len(points)
    if n < 3:
        return points
    keep = [False] * n
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        dmax, idx = 0.0, -1
        for k in range(i + 1, j):
            d = _perp(points[k], points[i], points[j])
            if d > dmax:
                dmax, idx = d, k
        if dmax > tol and idx > 0:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(points, keep) if k]


def ring_area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(s) / 2


def simplify_ring(ring, tol, digits):
    pts = [(round(x, digits), round(y, digits)) for x, y in ring]
    if len(pts) > 4:
        closed = pts[0] == pts[-1]
        body = pts[:-1] if closed else pts
        body = dp(body + ([body[0]] if closed else []), tol)
        pts = body if body and body[0] == body[-1] else body + ([body[0]] if closed else [])
    if len(pts) < 4:
        return None
    return [list(p) for p in pts]


def simplify_geometry(geom, tol, digits, min_area):
    if not geom:
        return None
    t = geom.get("type")
    if t == "Polygon":
        rings = []
        for i, r in enumerate(geom["coordinates"]):
            s = simplify_ring(r, tol, digits)
            if s and (i > 0 or ring_area(s) >= min_area or True):
                rings.append(s)
            if i == 0 and not s:
                return None
        return {"type": "Polygon", "coordinates": rings} if rings else None
    if t == "MultiPolygon":
        polys = []
        for poly in geom["coordinates"]:
            outer = simplify_ring(poly[0], tol, digits)
            if not outer or ring_area(outer) < min_area:
                continue
            rings = [outer] + [x for x in (simplify_ring(r, tol, digits) for r in poly[1:]) if x]
            polys.append(rings)
        if not polys:   # крошечные государства (острова) оставляем целиком
            best = max(geom["coordinates"], key=lambda p: ring_area(p[0]))
            ring = [[round(x, digits + 1), round(y, digits + 1)] for x, y in best[0]]
            if len(ring) > 60:
                ring = simplify_ring(best[0], 0.005, digits + 1) or ring
            return {"type": "Polygon", "coordinates": [ring]} if len(ring) >= 4 else None
        return {"type": "MultiPolygon", "coordinates": polys}
    return None


def feature_name(props):
    return str(props.get("shapeName") or props.get("NAME_1") or props.get("name") or props.get("ADMIN")
               or props.get("NAME") or props.get("admin") or "")


def slim_props(props):
    keys = ("name", "ADMIN", "shapeName", "NAME_1", "ISO_A3", "ISO_A2", "ISO3166-1-Alpha-3", "ISO3166-1-Alpha-2", "shapeISO")
    return {k: props[k] for k in keys if k in props}


def simplify_collection(data, spec):
    keep = spec.get("keep")
    out = []
    for f in data.get("features", []):
        props = f.get("properties") or {}
        if keep and not keep.search(feature_name(props)):
            continue
        g = simplify_geometry(f.get("geometry"), spec["tol"], spec["digits"], spec["min_area"])
        if g:
            out.append({"type": "Feature", "properties": slim_props(props), "geometry": g})
    return {"type": "FeatureCollection", "features": out}


def fetch_json(urls, timeout=40, limit=90 * 1024 * 1024):
    last = None
    for u in urls:
        try:
            req = Request(u, headers={"User-Agent": "NovariaGame/2.0", "Accept": "application/json"})
            with urlopen(req, timeout=timeout) as r:
                raw = r.read(limit + 1)
            if len(raw) > limit:
                raise ValueError("слишком большой файл")
            return json.loads(raw.decode("utf-8"))
        except Exception as e:      # пробуем следующее зеркало
            last = e
    raise last or RuntimeError("нет источников")


def load_layer(layer, fetcher=fetch_json):
    spec = SOURCES[layer]
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{layer}.json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    data = fetcher(spec["urls"])
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("Некорректный GeoJSON")
    slim = simplify_collection(data, spec)
    if not slim["features"]:
        raise ValueError("после фильтра нет объектов")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(slim, f, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        pass
    return slim
