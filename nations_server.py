"""Мультиплеер «Симулятор государства» — сервер комнат.

Каждый игрок управляет своей страной в браузере (экономика считается на клиенте),
сервер отвечает за общее: единые часы, 195 государств под управлением ИИ (реальный мир),
таблицу очков, дипломатию, войны с условиями мира, вассалитет, независимость и
международное голосование, исчерпание ресурсов, региональные восстания.
"""
import asyncio
import json
import math
import os
import random
import string
import time

from fastapi import WebSocket, WebSocketDisconnect

NROOMS: dict = {}
HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "world.json"), encoding="utf-8") as _f:
    WORLD = json.load(_f)
CINFO = {c["i"]: c for c in WORLD["countries"]}

# ------------------------------------------------------------------ настройки
MAX_PLAYERS = 6
SPEEDS = {"slow": 10.0, "normal": 6.0, "fast": 3.5}
LENGTHS = {"short": 120, "normal": 180, "long": 240}
DIFFS = {"story", "easy", "normal", "hard", "expert"}
START_GDP = 42000.0
START_POWER = 100.0
START_MONEY = {"story": 26000, "easy": 22000, "normal": 18000, "hard": 14500, "expert": 10500}
GDP_SCALE = 42000.0 / 160.0   # $млрд → игровые единицы (страна с ВВП ≈160 млрд $ = старт игрока)
PLAYER_MAX_GDP = 1200.0       # играть можно странами с ВВП до 1,2 трлн $; сверхдержавы остаются ИИ
GDP_SCORE_CAP = 1.015

NEWBIE_SHIELD = 24
WAR_COOLDOWN = 18
PEACE_SHIELD = 12
WAR_MAX_MONTHS = 24
DICTATE_FRONT = 60
REGION_FRONT = 70
WON_GRACE = 3
MAX_REGIONS_LOST = 2

AID_MAX_SHARE = 0.25
AID_FEE = 0.15
AID_COOLDOWN = 6
PACT_MONTHS = 12
PACT_BONUS = 0.04
PACT_MAX = 2
SANCTION_MONTHS = 6
SANCTION_DMG = 0.05
SANCTION_SELF = 0.01
SANCTION_COOLDOWN = 12
SANCTION_CAP = 0.10
PROPOSAL_TTL = 30.0

RUBBER_LAST = 0.05
RUBBER_FIRST = -0.03

# Вассалитет: срока нет. 4 года вассал не может напасть на сюзерена, потом может заявить о независимости.
VASSAL_LOCK = 48
VASSAL_TAKE = 0.10
VASSAL_GAIN = 0.05
MAX_VASSALS = 2
AI_INDEP_CHANCE = 0.012
VOTE_MONTHS = 3
PLAYER_VOTE_WEIGHT = 8
OPINION_MONTHS = 12

REBELLION_THRESHOLD = 22.0
REBELLION_CONFIRM = 3
REBELLION_MAX_MONTHS = 18
REGION_MAX = 24

# Ресурсы: «жизнь» месторождения при тире 1 в месяцах добычи. Зерно возобновляемо.
LIFE = {"o": 120, "y": 170, "c": 300, "e": 360}
RES_RU = {"g": "зерно", "o": "нефть", "y": "газ", "c": "уголь", "e": "руда"}


def now() -> float:
    return time.time()


def new_code(k: int = 5) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(alphabet, k=k))


def num(v, lo, hi, default=0.0) -> float:
    try:
        v = float(v)
    except (TypeError, ValueError):
        return default
    if math.isnan(v) or math.isinf(v):
        return default
    return max(lo, min(hi, v))


def clean_name(v, default="Игрок", n=24) -> str:
    s = "".join(ch for ch in str(v or "") if ch.isprintable()).strip()
    return s[:n] or default


def clean_res(lst) -> list:
    out = []
    if isinstance(lst, list):
        for it in lst[:3]:
            if isinstance(it, dict) and it.get("t") in RES_RU:
                out.append({"t": it["t"], "tier": int(num(it.get("tier"), 1, 5, 1))})
    return out


def eligible(iso: str) -> bool:
    c = CINFO.get(iso)
    return bool(c) and c["g"] <= PLAYER_MAX_GDP


# ------------------------------------------------------------------ сущности
class Player:
    ai = False

    def __init__(self, ws, pid: str, name: str, country: str):
        self.ws = ws
        self.id = pid
        self.name = name
        self.country = country
        self.iso = None
        self.connected = True
        self.ready = False
        self.eliminated = False
        self.out = False
        self.joined_month = 0
        self.rep = {"gdp": START_GDP, "money": 18000.0, "debt": 0.0, "stab": 68.0,
                    "appr": 61.0, "legit": 70.0, "power": START_POWER, "pop": 8200000.0,
                    "trust": 70.0, "income": 800.0}
        self.score_gdp = START_GDP
        self.score = 0.0
        self.comp = {}
        self.last_report = 0
        self.aid_cd: dict = {}
        self.sanction_cd: dict = {}
        self.war_cd = 0
        self.shield_until = NEWBIE_SHIELD
        self.pacts: dict = {}
        self.sanctions_in: list = []
        self.sanctions_out: dict = {}
        self.war = None
        self.vassal_of = None
        self.vassal_since = 0
        self.vassals: dict = {}
        self.opinions: list = []
        self.regions_lost = 0
        self.regions: dict = {}
        self.rebellion_pressure: dict = {}
        self.rebellions: dict = {}

    def pub(self) -> dict:
        return {"id": self.id, "name": self.name, "country": self.country, "iso": self.iso,
                "connected": self.connected, "ready": self.ready,
                "eliminated": self.eliminated, "out": self.out,
                "score": round(self.score, 1), "comp": self.comp,
                "vassal_of": self.vassal_of, "vassal_since": self.vassal_since,
                "gdp": round(self.rep["gdp"]), "money": round(self.rep["money"]),
                "stab": round(self.rep["stab"]), "appr": round(self.rep["appr"]),
                "power": round(self.rep["power"], 1), "pop": round(self.rep["pop"]), "ai": False}


class AI:
    """Государство под управлением сервера."""
    ai = True
    connected = False
    out = False

    def __init__(self, c: dict):
        self.id = "ai-" + c["i"].lower()
        self.iso = c["i"]
        self.country = c["ru"]
        self.info = c
        gdp = min(2_000_000.0, c["g"] * GDP_SCALE)
        self.rep = {"gdp": gdp, "money": gdp * random.uniform(.3, .55), "debt": 0.0,
                    "stab": random.uniform(48, 80), "appr": random.uniform(46, 76),
                    "legit": random.uniform(52, 85), "trust": random.uniform(50, 80),
                    "power": float(c["m"]), "pop": c["p"] * 1e6, "income": gdp * .019}
        self.alive = True
        self.owner = None             # кто аннексировал
        self.seat = None              # какой игрок занял это место
        self.vassal_of = None
        self.vassal_since = 0
        self.vassals: dict = {}
        self.war = None
        self.war_cd = 0
        self.shield_until = 0
        self.regions_lost = 0
        self.pacts: dict = {}
        self.score = 0.0
        self.comp = {}
        self.crisis_until = 0
        self.sanctioned: dict = {}
        self.depleted: set = set()
        self.res = {t: {"tier": n, "left": n * LIFE[t] * random.uniform(.7, 1.3), "rate": random.uniform(.8, 2.0)}
                    for t, n in c["r"].items() if t in LIFE}

    @property
    def eliminated(self) -> bool:
        return not self.alive

    def deposits(self) -> list:
        items = [(v["tier"], t) for t, v in self.res.items() if t not in self.depleted]
        if self.info["r"].get("g"):
            items.append((self.info["r"]["g"], "g"))
        items.sort(reverse=True)
        out = [{"t": t, "tier": max(1, min(5, tier))} for tier, t in items[:3]]
        return out or [{"t": "g", "tier": 1}]


def score_of(room, p) -> None:
    r = p.rep
    g = max(0.05, getattr(p, "score_gdp", r["gdp"]) / START_GDP)
    eco = max(0.0, min(100.0, 30.0 + 30.0 * math.log2(g)))
    welfare = max(0.0, min(100.0, (r["stab"] + r["appr"]) / 2))
    gov = max(0.0, min(100.0, (r["legit"] * 0.5 + r["trust"] * 0.5)))
    net = r["money"] - r["debt"]
    fin = max(0.0, min(100.0, 50 + (net - room.start_money) / 400))
    mil = max(0.0, min(100.0, r["power"] / START_POWER * 40))
    score = eco * 0.36 + welfare * 0.20 + gov * 0.14 + fin * 0.14 + mil * 0.16
    if getattr(p, "out", False):
        score *= 0.6
    if p.eliminated:
        score *= 0.4
    p.comp = {"eco": round(eco), "welfare": round(welfare), "gov": round(gov),
              "fin": round(fin), "mil": round(mil)}
    p.score = score


class Room:
    def __init__(self, code: str):
        self.code = code
        self.players: dict = {}
        self.ai: dict = {}
        self.host = None
        self.state = "lobby"
        self.auto_paused = False
        self.month = 0
        self.length = LENGTHS["normal"]
        self.speed = "normal"
        self.diff = "normal"
        self.task = None
        self.proposals: dict = {}
        self.wars: dict = {}
        self.cedes: dict = {}
        self.rebellions: dict = {}
        self.votes: dict = {}
        self.created = now()
        self.winner = None
        self.final: list = []
        self.world_events: list = []
        self.prices = {t: 1.0 for t in RES_RU}
        for c in WORLD["countries"]:
            self.ai["ai-" + c["i"].lower()] = AI(c)

    @property
    def start_money(self) -> float:
        return float(START_MONEY.get(self.diff, 18000))

    def ent(self, eid):
        return self.players.get(eid) or self.ai.get(eid)

    def taken(self) -> set:
        return {p.iso for p in self.players.values() if p.iso}

    def assign_country(self, p: Player, iso) -> bool:
        """Страна игрока занимает место реального государства; его ИИ-двойник убирается из мира."""
        if iso and (not eligible(iso) or iso in self.taken() - {p.iso}):
            return False
        if not iso:
            pool = [c["i"] for c in WORLD["countries"] if eligible(c["i"]) and c["i"] not in self.taken() and 5 <= c["g"] <= 900]
            if not pool:
                return False
            iso = random.choice(pool)
        self.release_country(p)
        p.iso = iso
        slot = self.ai.get("ai-" + iso.lower())
        if slot:
            slot.alive = False
            slot.seat = p.id
        return True

    def release_country(self, p: Player):
        slot = self.ai.get("ai-" + (p.iso or "").lower())
        if slot and slot.seat == p.id:
            slot.alive = True
            slot.seat = None
        p.iso = None

    async def send(self, p, payload: dict):
        if getattr(p, "ai", False) or not p.connected:
            return
        try:
            await p.ws.send_json(payload)
        except Exception:
            p.connected = False

    async def broadcast(self, payload: dict, exclude=None):
        for p in list(self.players.values()):
            if p.id != exclude:
                await self.send(p, payload)

    def alive(self):
        return [p for p in self.players.values() if not p.eliminated]

    def lobby_info(self) -> dict:
        return {"code": self.code, "state": self.state, "host": self.host,
                "month": self.month, "length": self.length, "speed": self.speed,
                "diff": self.diff, "players": [p.pub() for p in self.players.values()],
                "taken": sorted(self.taken())}

    async def push_lobby(self):
        await self.broadcast({"type": "lobby", **self.lobby_info()})

    async def notice(self, text: str, kind: str = "info", to=None):
        payload = {"type": "notice", "text": text, "kind": kind, "month": self.month}
        if to:
            await self.send(to, payload)
        else:
            await self.broadcast(payload)

    async def world_event(self, text: str, kind: str = "world"):
        item = {"text": text, "month": self.month}
        self.world_events = (self.world_events + [item])[-50:]
        await self.broadcast({"type": "world_event", "kind": kind, **item})

    def world_pub(self) -> dict:
        """Компактно: [iso, ВВП/1000, мощь, стаб., состояние(0 жив,1 аннексирован,2 место игрока), владелец, сюзерен, война, исчерпано]."""
        rows = []
        for a in self.ai.values():
            state = 0 if a.alive else (1 if a.owner else 2)
            rows.append([a.iso, round(a.rep["gdp"] / 1000, 1), round(a.rep["power"]), round(a.rep["stab"]), state,
                         a.owner or a.seat or "", a.vassal_of or "", 1 if a.war else 0, "".join(sorted(a.depleted))])
        return {"rows": rows, "prices": {k: round(v, 2) for k, v in self.prices.items()}}

    def compute_score(self, p) -> None:
        score_of(self, p)

    def ranking(self):
        return sorted(self.players.values(), key=lambda x: -x.score)

    def ranking_pub(self):
        return [p.pub() for p in self.ranking()]

    def rubber(self, p: Player) -> float:
        live = [x for x in self.players.values() if not x.eliminated]
        if len(live) < 3 or p.eliminated:
            return 0.0
        order = sorted(live, key=lambda x: -x.score)
        idx = order.index(p) if p in order else 0
        t = idx / (len(order) - 1)
        return RUBBER_FIRST + (RUBBER_LAST - RUBBER_FIRST) * t

    def active_vassals(self, p) -> list:
        return [vid for vid in p.vassals if self.ent(vid) and self.ent(vid).vassal_of == p.id]

    def income_mod(self, p: Player) -> dict:
        pacts = sum(1 for _, end in p.pacts.items() if end > self.month)
        pact = PACT_BONUS * min(pacts, PACT_MAX)
        sanc = min(SANCTION_CAP, SANCTION_DMG * sum(1 for s in p.sanctions_in if s["end"] > self.month))
        self_cost = SANCTION_SELF * sum(1 for _, end in p.sanctions_out.items() if end > self.month)
        rub = self.rubber(p)
        vas = 0.0
        if p.vassal_of:
            vas -= VASSAL_TAKE
        vas += VASSAL_GAIN * min(MAX_VASSALS, len(self.active_vassals(p)))
        op = sum(o["pct"] for o in p.opinions if o["end"] > self.month)
        return {"pact": round(pact, 4), "sanction": round(-sanc - self_cost, 4),
                "rubber": round(rub, 4), "vassal": round(vas, 4), "opinion": round(op, 4),
                "total": round(pact - sanc - self_cost + rub + vas + op, 4)}

    # ---- цикл времени
    async def run(self):
        try:
            while self.state == "running" and self.month < self.length:
                await asyncio.sleep(SPEEDS.get(self.speed, 6.0))
                if self.state != "running":
                    break
                if not any(p.connected for p in self.players.values()):
                    self.state = "paused"
                    self.auto_paused = True
                    break
                await self.tick()
                if self.should_finish():
                    break
            if self.state == "running":
                await self.finish()
        except asyncio.CancelledError:
            pass

    def should_finish(self) -> bool:
        if self.month >= self.length:
            return True
        return len(self.players) >= 2 and len(self.alive()) <= 1

    async def tick(self):
        self.month += 1
        await self.process_wars()
        await self.ai_month()
        await self.process_rebellions()
        await self.close_votes()
        self.expire()
        for p in self.players.values():
            self.compute_score(p)
        msg = {"type": "tick", "month": self.month, "length": self.length,
               "standings": self.ranking_pub(), "mods": {p.id: self.income_mod(p) for p in self.players.values()},
               "prices": {k: round(v, 2) for k, v in self.prices.items()},
               "wars": [self.war_pub(w) for w in self.wars.values()],
               "rebellions": [self.rebellion_pub(r) for r in self.rebellions.values()],
               "votes": [self.vote_pub(v) for v in self.votes.values()]}
        if self.month % 2 == 0:
            msg["world"] = self.world_pub()
        await self.broadcast(msg)

    def expire(self):
        for pid, pr in list(self.proposals.items()):
            if pr["exp"] < now():
                self.proposals.pop(pid, None)
        for p in self.players.values():
            p.sanctions_in = [s for s in p.sanctions_in if s["end"] > self.month]
            p.sanctions_out = {k: v for k, v in p.sanctions_out.items() if v > self.month}
            p.pacts = {k: v for k, v in p.pacts.items() if v > self.month}
            p.opinions = [o for o in p.opinions if o["end"] > self.month]
        for rid, c in list(self.cedes.items()):
            if c["exp"] < self.month:
                self.cedes.pop(rid, None)

    async def finish(self):
        self.state = "finished"
        for p in self.players.values():
            self.compute_score(p)
        self.final = self.ranking_pub()
        self.winner = self.final[0]["id"] if self.final else None
        await self.broadcast({"type": "final", "standings": self.final, "winner": self.winner,
                              "month": self.month, "world": self.world_pub()})

    # ---- ИИ-государства, ресурсы, вассалы
    async def ai_month(self):
        for a in list(self.ai.values()):
            if not a.alive:
                continue
            r = a.rep
            a.sanctioned = {k: v for k, v in a.sanctioned.items() if v > self.month}
            crisis = a.crisis_until > self.month or bool(a.sanctioned)
            growth = random.uniform(0.001, 0.008) * (1.0 if r["stab"] >= 45 else .4) * (.5 if crisis else 1.0)
            r["gdp"] = max(1000, min(2_000_000, r["gdp"] * (1 + growth)))
            r["money"] = max(0, min(5_000_000, r["money"] * 1.001 + r["gdp"] * .0001 * random.uniform(-1, 2)))
            r["pop"] = min(2_000_000_000, r["pop"] * (1 + random.uniform(-.0001, .0007)))
            r["stab"] = max(8, min(95, r["stab"] + (62 - r["stab"]) * .01 + random.uniform(-.5, .5) - (.35 if crisis else 0)))
            r["appr"] = max(5, min(95, r["appr"] + (r["stab"] - 60) * .008 + random.uniform(-.4, .4)))
            if not a.war:
                r["power"] = max(4, min(100000, r["power"] * (1 + random.uniform(-.002, .006))))
            for t, d in a.res.items():
                if t in a.depleted:
                    continue
                d["left"] -= d["tier"] * d["rate"]
                if d["left"] <= 0:
                    a.depleted.add(t)
                    a.crisis_until = self.month + 24
                    r["stab"] = max(8, r["stab"] - 6)
                    r["gdp"] *= 0.97
                    if d["tier"] >= 3:
                        self.prices[t] = min(1.8, self.prices[t] + 0.05)
                    await self.world_event(f"⛽ У государства {a.country} закончилась {RES_RU[t]}: кризис, мировые цены растут.", "resource")
            if a.vassal_of and self.month - a.vassal_since >= VASSAL_LOCK and random.random() < AI_INDEP_CHANCE:
                lord = self.players.get(a.vassal_of)
                if lord and not lord.eliminated and not a.war and not lord.war:
                    await self.declare_independence(a)
        for t in self.prices:
            self.prices[t] = max(1.0, self.prices[t] - 0.002)
        if self.month % 3 == 0:
            for a in self.ai.values():
                if a.alive:
                    score_of(self, a)

    async def declare_independence(self, ent):
        """Вассал (игрок или ИИ) разрывает вассалитет и начинает войну за независимость."""
        lord = self.ent(ent.vassal_of)
        if not lord:
            return False
        lord.vassals.pop(ent.id, None)
        ent.vassal_of = None
        await self.world_event(f"🚩 {ent.country}: «Мы больше не вассал» — {lord.country}. Началась война за независимость.", "independence")
        await self.start_war(ent, lord, independence=True)
        await self.open_vote(ent, lord)
        return True

    # ---- голосование мира
    def vote_pub(self, v: dict) -> dict:
        return {"id": v["id"], "text": v["text"], "actor": v["actor"], "target": v["target"],
                "left": max(0, v["end"] - self.month), "ai_yes": v["ai_yes"], "ai_no": v["ai_no"],
                "yes": len(v["yes"]), "no": len(v["no"])}

    async def open_vote(self, actor, target):
        vid = "v" + "".join(random.choices(string.digits, k=5))
        yes = no = 0
        for a in self.ai.values():
            if not a.alive or a.id in (actor.id, target.id):
                continue
            has_vassals = any(self.ent(v) and self.ent(v).vassal_of == a.id for v in a.vassals)
            p_yes = 0.30 if has_vassals else (0.8 if a.vassal_of else 0.62)
            if random.random() < p_yes:
                yes += 1
            else:
                no += 1
        v = {"id": vid, "actor": actor.id, "target": target.id, "end": self.month + VOTE_MONTHS,
             "yes": set(), "no": set(), "ai_yes": yes, "ai_no": no,
             "text": f"{actor.country} объявил независимость от {target.country}. Одобряете или осуждаете?"}
        self.votes[vid] = v
        await self.broadcast({"type": "vote_open", **self.vote_pub(v)})

    async def close_votes(self):
        for vid, v in list(self.votes.items()):
            if v["end"] > self.month:
                continue
            self.votes.pop(vid, None)
            actor, target = self.ent(v["actor"]), self.ent(v["target"])
            yes = v["ai_yes"] + PLAYER_VOTE_WEIGHT * len(v["yes"])
            no = v["ai_no"] + PLAYER_VOTE_WEIGHT * len(v["no"])
            approved = yes > no
            if actor and not actor.eliminated:
                if isinstance(actor, Player):
                    actor.opinions.append({"pct": 0.04 if approved else -0.04, "end": self.month + OPINION_MONTHS})
                else:
                    actor.rep["stab"] = max(8, min(95, actor.rep["stab"] + (5 if approved else -5)))
            if approved and isinstance(target, Player) and not target.eliminated:
                target.opinions.append({"pct": -0.02, "end": self.month + 6})
            word = "одобрил" if approved else "осудил"
            await self.broadcast({"type": "vote_result", "id": vid, "approved": approved, "yes": yes, "no": no,
                                  "players_yes": len(v["yes"]), "players_no": len(v["no"]),
                                  "text": f"Мир {word} независимость: {actor.country if actor else ''} (за {yes} · против {no})"})

    # ---- войны
    def war_pub(self, w: dict) -> dict:
        return {"id": w["id"], "a": w["a"], "d": w["d"], "p": round(w["p"]), "m": w["m"],
                "won": w.get("won"), "wm": w.get("wm", 0), "ind": bool(w.get("ind"))}

    async def start_war(self, a, d, independence=False):
        wid = "w" + "".join(random.choices(string.digits, k=5))
        self.wars[wid] = {"id": wid, "a": a.id, "d": d.id, "p": 50.0, "m": 0, "ind": independence}
        a.war = d.war = wid
        await self.send(a, {"type": "war_start", "war": wid, "enemy": d.country, "aggressor": True, "ind": independence})
        await self.send(d, {"type": "war_start", "war": wid, "enemy": a.country, "aggressor": False, "ind": independence})
        if not independence:
            await self.notice(f"⚔️ {a.country} объявил войну стране {d.country}!", "war")

    async def process_wars(self):
        for wid, w in list(self.wars.items()):
            a, d = self.ent(w["a"]), self.ent(w["d"])
            if not a or not d or a.eliminated or d.eliminated:
                await self.end_war(w, "cancel")
                continue
            w["m"] += 1
            pa = max(1.0, a.rep["power"]) * (0.8 + a.rep["appr"] / 250)
            pd = max(1.0, d.rep["power"]) * 1.15 * (0.8 + d.rep["appr"] / 250)
            delta = (pa - pd) / (pa + pd) * 11 + random.uniform(-2.5, 2.5)
            w["p"] = max(0.0, min(100.0, w["p"] + max(-7.0, min(7.0, delta))))
            for side, ratio, front in ((a, pd / (pa + pd), w["p"]), (d, pa / (pa + pd), 100 - w["p"])):
                if side.ai:
                    side.rep["power"] = max(4.0, side.rep["power"] * (1 - 0.014 * ratio))
                    side.rep["money"] = max(0.0, side.rep["money"] - side.rep["gdp"] * 0.0008)
                    if front < 50:      # ИИ мобилизуется, когда проигрывает фронт
                        side.rep["power"] *= 1.012
                else:
                    await self.send(side, {"type": "war_cost", "war": wid, "army_loss": int(300 + 900 * ratio),
                                           "money": 100, "approval": 0.15})
            for side, front in ((a, w["p"]), (d, 100 - w["p"])):
                key = "hint_" + side.id
                if front >= DICTATE_FRONT and not w.get(key):
                    w[key] = True
                    other = d if side is a else a
                    await self.send(side, {"type": "dictate_open", "enemy": other.country})
                    if not side.ai:
                        await self.notice(f"💪 У {side.country} перевес {int(front)}% — можно диктовать условия.", "war")
            if not w.get("won"):
                if w["p"] >= 100:
                    w["won"], w["wm"] = a.id, 0
                    await self.notice(f"🏆 {a.country} полностью разгромил {d.country}! Выбор условий: {WON_GRACE} мес.", "war")
                elif w["p"] <= 0:
                    w["won"], w["wm"] = d.id, 0
                    await self.notice(f"🏆 {d.country} полностью разгромил {a.country}! Выбор условий: {WON_GRACE} мес.", "war")
            else:
                w["wm"] = w.get("wm", 0) + 1
                if w["wm"] >= WON_GRACE or self.ent(w["won"]).ai:
                    win = self.ent(w["won"])
                    lose = d if win is a else a
                    await self.resolve(w, win, lose, "tribute")
                    continue
            if not w.get("won") and WAR_MAX_MONTHS and w["m"] >= WAR_MAX_MONTHS:
                await self.end_war(w, "draw")

    async def end_war(self, w: dict, result: str):
        self.wars.pop(w["id"], None)
        a, d = self.ent(w["a"]), self.ent(w["d"])
        for p in (a, d):
            if p:
                p.war = None
        if not a or not d:
            return
        a.war_cd = self.month + WAR_COOLDOWN
        d.shield_until = max(d.shield_until, self.month + PEACE_SHIELD)
        a.shield_until = max(a.shield_until, self.month + 6)
        if result == "draw":
            for p, e in ((a, d), (d, a)):
                await self.send(p, {"type": "war_end", "result": "draw", "enemy": e.country, "money": 0, "approval": -2, "stability": 0})
            await self.notice(f"🕊 Война {a.country} и {d.country} закончилась ничьей.", "war")
        else:
            for p, e in ((a, d), (d, a)):
                await self.send(p, {"type": "war_end", "result": "peace", "enemy": e.country, "money": 0, "approval": 0, "stability": 0})
            await self.notice(f"🕊 {a.country} и {d.country} заключили мир.", "war")

    async def resolve(self, w: dict, win, lose, mode: str):
        """Условия мира, которые выбрал победитель."""
        front = w["p"] if win.id == w["a"] else 100 - w["p"]
        k = 1.0 if w.get("won") else 0.4 + 0.6 * front / 100
        if mode == "tribute":
            amount = int(min(1500, (500 + lose.rep["gdp"] * 0.012) * k, max(0, lose.rep["money"]) * 0.25))
            lose.rep["money"] = max(0, lose.rep["money"] - amount)
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": amount, "approval": 3, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": -amount, "approval": -6, "stability": -5})
            await self.notice(f"💰 {lose.country} выплачивает контрибуцию стране {win.country}: {amount} млн.", "war")
        elif mode == "vassal":
            win.vassals[lose.id] = self.month
            lose.vassal_of, lose.vassal_since = win.id, self.month
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 4, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": 0, "approval": -6, "stability": -3})
            await self.notice(f"👑 {lose.country} стал вассалом страны {win.country}. Срока нет; через {VASSAL_LOCK // 12} года он сможет потребовать независимости.", "war")
        elif mode == "region":
            lose.regions_lost += 1
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 3, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": 0, "approval": -2, "stability": 0})
            if lose.ai:
                pop = int(min(lose.rep["pop"] * 0.12, win.rep["pop"] * 0.30))
                gdp = int(min(lose.rep["gdp"] * 0.10, win.rep["gdp"] * 0.25))
                lose.rep["pop"] -= pop
                lose.rep["gdp"] -= gdp
                lose.rep["stab"] = max(8, lose.rep["stab"] - 5)
                await self.send(win, {"type": "region_gain", "kind": "region", "from": lose.country, "iso": lose.iso,
                                      "region": {"name": f"Область {lose.regions_lost}: {lose.country}", "from": lose.country,
                                                 "pop": pop, "gdp": gdp, "res": lose.deposits()[:1], "full": False}})
            else:
                self.cedes[lose.id] = {"to": win.id, "k": k, "kind": "region", "exp": self.month + 6}
                await self.send(lose, {"type": "cede_request", "to": win.id, "kind": "region", "country": win.country})
            await self.notice(f"🗺 {win.country} отторгает область у страны {lose.country}.", "war")
        elif mode == "annex":
            pop = int(min(lose.rep["pop"] * 0.5, win.rep["pop"] * 0.6))
            gdp = int(min(lose.rep["gdp"] * 0.4, win.rep["gdp"] * 0.5))
            res = lose.deposits() if lose.ai else []
            await self.send(win, {"type": "region_gain", "kind": "annex", "from": lose.country, "iso": getattr(lose, "iso", None),
                                  "region": {"name": f"Земли {lose.country}", "from": lose.country, "pop": pop, "gdp": gdp, "full": True, "res": res}})
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 4, "stability": -3})
            if lose.ai:
                lose.alive = False
                lose.owner = win.id
                lose.vassal_of = None
                await self.world_event(f"🏴 {win.country} полностью захватил государство {lose.country}.", "war")
            else:
                await self.send(lose, {"type": "annexed", "by": win.country})
                lose.eliminated = True
                self.compute_score(lose)
                await self.notice(f"🏴 {win.country} полностью захватил страну {lose.country}!", "war")
            win.vassals.pop(lose.id, None)
        self.wars.pop(w["id"], None)
        for p in (win, lose):
            p.war = None
        a = self.ent(w["a"])
        if a:
            a.war_cd = self.month + WAR_COOLDOWN
        lose.shield_until = max(lose.shield_until, self.month + PEACE_SHIELD)
        win.shield_until = max(win.shield_until, self.month + 6)
        if self.should_finish():
            if self.task:
                self.task.cancel()
            await self.finish()

    # ---- восстания регионов
    def rebellion_pub(self, r: dict) -> dict:
        return {"id": r["id"], "owner": r["owner"], "region": r["region"], "progress": round(r["progress"]),
                "month": r["month"], "pop": r["pop"], "waiting": bool(r.get("waiting"))}

    async def process_rebellions(self):
        for rid, r in list(self.rebellions.items()):
            owner = self.players.get(r["owner"])
            if not owner or owner.eliminated:
                self.rebellions.pop(rid, None)
                continue
            r["month"] += 1
            if r.get("waiting"):
                if r["month"] - r["wait_from"] >= 6:
                    await self.finish_rebellion(r, owner, "autonomy")
                continue
            power = max(1.0, owner.rep["power"])
            delta = (power / (power + 60.0) - 0.5) * 14 + random.uniform(-2.2, 2.2)
            r["progress"] = max(0.0, min(100.0, r["progress"] + delta))
            await self.send(owner, {"type": "rebellion_update", **self.rebellion_pub(r),
                                    "army_loss": int(150 + 250 * (1 - r["progress"] / 100))})
            if r["progress"] >= 100:
                owner.rebellions.pop(r["region"], None)
                self.rebellions.pop(rid, None)
                owner.rebellion_pressure[r["region"]] = 0
                await self.send(owner, {"type": "rebellion_end", "region": r["region"], "result": "suppressed"})
            elif r["progress"] <= 0 or r["month"] >= REBELLION_MAX_MONTHS:
                r["waiting"], r["wait_from"] = True, r["month"]
                await self.send(owner, {"type": "settlement_offer", "scope": "region", "region": r["region"]})

    async def finish_rebellion(self, r: dict, owner, choice: str):
        self.rebellions.pop(r["id"], None)
        owner.rebellions.pop(r["region"], None)
        owner.rebellion_pressure[r["region"]] = 0
        if choice == "independence":
            owner.regions_lost += 1
        await self.send(owner, {"type": "rebellion_end", "region": r["region"], "result": choice})
        words = {"reintegrate": "возвращён силой", "autonomy": "получил автономию", "independence": "объявил независимость"}
        await self.notice(f"🚩 Регион «{r['region']}» страны {owner.country}: {words.get(choice, choice)}.", "war")


# ------------------------------------------------------------------ обработка сообщений
async def handle(room: Room, p: Player, msg: dict):
    kind = msg.get("type")

    if kind == "ping":
        await room.send(p, {"type": "pong", "t": msg.get("t")})
        return
    if kind == "chat":
        text = "".join(ch for ch in str(msg.get("text", "")) if ch.isprintable()).strip()[:200]
        if text:
            await room.broadcast({"type": "chat", "name": p.name, "country": p.country, "text": text})
        return
    if kind == "ready" and room.state == "lobby":
        p.ready = bool(msg.get("value", True))
        await room.push_lobby()
        return
    if kind == "pick" and room.state == "lobby":
        iso = str(msg.get("iso", "")).upper()
        if room.assign_country(p, iso):
            if msg.get("rename", True):
                p.country = CINFO[iso]["ru"]
            await room.push_lobby()
        else:
            await room.notice("Эта страна недоступна (занята или слишком крупная).", "warn", p)
        return
    if kind == "settings" and room.state == "lobby" and p.id == room.host:
        if msg.get("speed") in SPEEDS:
            room.speed = msg["speed"]
        if msg.get("length") in LENGTHS:
            room.length = LENGTHS[msg["length"]]
        if msg.get("diff") in DIFFS:
            room.diff = msg["diff"]
        await room.push_lobby()
        return
    if kind == "start" and room.state == "lobby" and p.id == room.host:
        if len(room.players) < 1:
            await room.notice("Нужен хотя бы один игрок.", "warn", p)
            return
        room.state = "running"
        room.month = 0
        for q in room.players.values():
            q.eliminated = False
            q.rep["money"] = room.start_money
            q.score_gdp = START_GDP
            room.compute_score(q)
        await room.broadcast({"type": "start", "diff": room.diff, "length": room.length, "speed": room.speed,
                              "month": 0, "players": [q.pub() for q in room.players.values()],
                              "standings": room.ranking_pub(), "world": room.world_pub()})
        room.task = asyncio.create_task(room.run())
        return
    if kind == "pause" and p.id == room.host and room.state in ("running", "paused"):
        if room.state == "running":
            room.state = "paused"
            if room.task:
                room.task.cancel()
            room.auto_paused = False
            await room.broadcast({"type": "paused", "value": True})
        else:
            room.state = "running"
            await room.broadcast({"type": "paused", "value": False})
            room.task = asyncio.create_task(room.run())
        return
    if kind == "sync":
        await room.send(p, {"type": "state", **room.lobby_info(),
                            "wars": [room.war_pub(w) for w in room.wars.values()],
                            "rebellions": [room.rebellion_pub(r) for r in room.rebellions.values()],
                            "votes": [room.vote_pub(v) for v in room.votes.values()],
                            "mods": {q.id: room.income_mod(q) for q in room.players.values()},
                            "standings": room.ranking_pub(), "world": room.world_pub()})
        return
    if room.state not in ("running", "paused") or p.eliminated:
        return

    if kind == "report":
        await on_report(room, p, msg)
    elif kind == "eliminated":
        p.eliminated = True
        room.cedes.pop(p.id, None)
        room.compute_score(p)
        await room.notice(f"💀 {p.country} выбыл из игры.", "war")
        if p.war and p.war in room.wars:
            await room.end_war(room.wars[p.war], "cancel")
        if room.should_finish():
            if room.task:
                room.task.cancel()
            await room.finish()
    elif kind == "aid":
        await on_aid(room, p, msg)
    elif kind == "propose":
        await on_propose(room, p, msg)
    elif kind == "answer":
        await on_answer(room, p, msg)
    elif kind == "sanction":
        await on_sanction(room, p, msg)
    elif kind == "war":
        await on_war(room, p, msg)
    elif kind == "peace":
        await on_peace(room, p, msg)
    elif kind == "dictate":
        await on_dictate(room, p, msg)
    elif kind == "cede":
        await on_cede(room, p, msg)
    elif kind == "independence":
        await on_independence(room, p)
    elif kind == "release":
        await on_release(room, p, msg)
    elif kind == "vote":
        await on_vote(room, p, msg)
    elif kind == "settlement":
        await on_settlement(room, p, msg)


async def on_report(room: Room, p: Player, msg: dict):
    """Клиент присылает показатели. Сервер ограничивает рост показателей в таблице очков."""
    r = msg.get("rep") or {}
    old = p.rep
    new = {
        "gdp": num(r.get("gdp"), 1000, 2_000_000, old["gdp"]),
        "money": num(r.get("money"), 0, 5_000_000, old["money"]),
        "debt": num(r.get("debt"), 0, 5_000_000, old["debt"]),
        "stab": num(r.get("stab"), 0, 100, old["stab"]),
        "appr": num(r.get("appr"), 0, 100, old["appr"]),
        "legit": num(r.get("legit"), 0, 100, old["legit"]),
        "trust": num(r.get("trust"), 0, 100, old["trust"]),
        "power": num(r.get("power"), 1, 100000, old["power"]),
        "pop": num(r.get("pop"), 100000, 2_000_000_000, old["pop"]),
        "income": num(r.get("income"), 0, 100000, old["income"]),
    }
    months = max(1, room.month - p.last_report)
    p.last_report = room.month
    cap = p.score_gdp * (GDP_SCORE_CAP ** months)
    p.score_gdp = max(1000.0, min(new["gdp"], cap)) if new["gdp"] >= p.score_gdp else new["gdp"]
    new["power"] = min(new["power"], old["power"] * (1.06 ** months) + 3)
    p.rep = new
    p.out = bool(msg.get("out"))
    raw = r.get("regions") or []
    clean = {}
    if isinstance(raw, list):
        for item in raw[:REGION_MAX]:
            if isinstance(item, dict):
                name = clean_name(item.get("name"), "Регион", 48)
                clean[name] = {"loyalty": num(item.get("loyalty"), 0, 100, 50), "unrest": num(item.get("unrest"), 0, 100, 20),
                               "pop": num(item.get("pop"), 10000, 500_000_000, 100000)}
    p.regions = clean
    room.compute_score(p)
    if room.state != "running":
        return
    for name, region in clean.items():
        if region["loyalty"] <= REBELLION_THRESHOLD or region["unrest"] >= 82:
            p.rebellion_pressure[name] = p.rebellion_pressure.get(name, 0) + 1
        else:
            p.rebellion_pressure[name] = max(0, p.rebellion_pressure.get(name, 0) - 1)
        if (p.rebellion_pressure[name] >= REBELLION_CONFIRM and name not in p.rebellions
                and not p.eliminated and not p.war and len(p.regions) > 3):
            rid = "r" + "".join(random.choices(string.digits, k=5))
            p.rebellions[name] = rid
            room.rebellions[rid] = {"id": rid, "owner": p.id, "region": name, "progress": 50.0, "month": 0, "pop": region["pop"]}
            await room.send(p, {"type": "rebellion_start", "id": rid, "region": name, "progress": 50, "pop": region["pop"]})
            await room.notice(f"🚩 В стране {p.country} началось восстание в регионе «{name}».", "war")


def distance_km(a, b) -> float:
    """Расстояние между странами по координатам из world.json (для ограничения далёких войн)."""
    ca, cb = CINFO.get(getattr(a, "iso", None)), CINFO.get(getattr(b, "iso", None))
    if not ca or not cb:
        return 0.0
    la1, lo1, la2, lo2 = map(math.radians, (ca["lat"], ca["lon"], cb["lat"], cb["lon"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def target(room: Room, p: Player, msg: dict):
    q = room.ent(str(msg.get("to", "")))
    if not q or q.id == p.id or q.eliminated:
        return None
    return q


async def on_aid(room: Room, p: Player, msg: dict):
    q = target(room, p, msg)
    if not q:
        return
    if q.ai:
        await room.notice("Государства под управлением ИИ помощь деньгами не принимают: предложите торговый пакт.", "warn", p)
        return
    amount = int(num(msg.get("amount"), 0, 1_000_000, 0))
    if amount < 100:
        await room.notice("Минимальный перевод — 100 млн.", "warn", p)
        return
    cap = int(p.rep["money"] * AID_MAX_SHARE)
    if amount > cap:
        await room.notice(f"Можно перевести не больше 25% казны (сейчас ≤ {cap} млн).", "warn", p)
        return
    if p.aid_cd.get(q.id, -99) + AID_COOLDOWN > room.month:
        await room.notice(f"{q.country}: следующий перевод через {p.aid_cd[q.id] + AID_COOLDOWN - room.month} мес.", "warn", p)
        return
    p.aid_cd[q.id] = room.month
    p.rep["money"] -= amount
    got = int(amount * (1 - AID_FEE))
    await room.send(p, {"type": "aid_out", "amount": amount, "to": q.country})
    await room.send(q, {"type": "aid_in", "amount": got, "from": p.country})
    await room.notice(f"🤝 {p.country} направил помощь стране {q.country}.", "dip")


async def on_propose(room: Room, p: Player, msg: dict):
    q = target(room, p, msg)
    if not q or msg.get("what") != "pact":
        return
    active_p = sum(1 for e in p.pacts.values() if e > room.month)
    active_q = sum(1 for e in q.pacts.values() if e > room.month)
    if p.pacts.get(q.id, 0) > room.month:
        await room.notice("Пакт с этой страной уже действует.", "warn", p)
        return
    if active_p >= PACT_MAX or active_q >= PACT_MAX:
        await room.notice(f"У каждой страны не больше {PACT_MAX} торговых пактов.", "warn", p)
        return
    if q.ai:   # ИИ соглашается не всегда
        if q.war or random.random() > 0.35 + q.rep["stab"] / 200:
            await room.notice(f"{q.country} отклонил торговый пакт.", "warn", p)
            return
        p.pacts[q.id] = room.month + PACT_MONTHS
        await room.notice(f"📜 Торговый пакт: {p.country} ↔ {q.country} на {PACT_MONTHS} мес.", "dip")
        return
    pid = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    room.proposals[pid] = {"id": pid, "what": "pact", "from": p.id, "to": q.id, "exp": now() + PROPOSAL_TTL}
    await room.send(q, {"type": "proposal", "id": pid, "what": "pact", "from": p.country,
                        "text": f"{p.country} предлагает торговый пакт на {PACT_MONTHS} мес.: +{int(PACT_BONUS * 100)}% дохода обеим странам.",
                        "ttl": int(PROPOSAL_TTL)})
    await room.notice(f"Предложение отправлено: {q.country}.", "info", p)


async def on_answer(room: Room, p: Player, msg: dict):
    pr = room.proposals.pop(str(msg.get("id", "")), None)
    if not pr or pr["to"] != p.id or pr["exp"] < now():
        return
    a = room.players.get(pr["from"])
    if not a or a.eliminated:
        return
    if not msg.get("accept"):
        await room.notice(f"{p.country} отклонил предложение.", "warn", a)
        return
    end = room.month + PACT_MONTHS
    a.pacts[p.id] = end
    p.pacts[a.id] = end
    await room.notice(f"📜 Торговый пакт: {a.country} ↔ {p.country} на {PACT_MONTHS} мес.", "dip")


async def on_sanction(room: Room, p: Player, msg: dict):
    q = target(room, p, msg)
    if not q:
        return
    if q.ai:
        if p.sanction_cd.get(q.id, -99) + SANCTION_COOLDOWN > room.month:
            await room.notice("Санкции против этой страны уже вводились недавно.", "warn", p)
            return
        p.sanction_cd[q.id] = room.month
        end = room.month + SANCTION_MONTHS
        p.sanctions_out[q.id] = end
        q.sanctioned[p.id] = end
        await room.notice(f"⛔ {p.country} ввёл санкции против {q.country} на {SANCTION_MONTHS} мес.", "dip")
        return
    if p.sanction_cd.get(q.id, -99) + SANCTION_COOLDOWN > room.month:
        await room.notice("Санкции против этой страны уже вводились недавно.", "warn", p)
        return
    if p.sanctions_out.get(q.id, 0) > room.month:
        return
    p.sanction_cd[q.id] = room.month
    end = room.month + SANCTION_MONTHS
    p.sanctions_out[q.id] = end
    q.sanctions_in.append({"from": p.id, "end": end})
    await room.notice(f"⛔ {p.country} ввёл санкции против {q.country} на {SANCTION_MONTHS} мес.", "dip")


async def on_war(room: Room, p: Player, msg: dict):
    q = target(room, p, msg)
    if not q:
        return
    if room.month < NEWBIE_SHIELD:
        await room.notice(f"Война запрещена до {NEWBIE_SHIELD}-го месяца (защита новичков).", "warn", p)
        return
    km = distance_km(p, q)
    need = 0.0 if km < 1800 else (1.2 if km < 5500 else 1.8)
    if need and p.rep["power"] < START_POWER * need:
        await room.notice(f"До {q.country} около {int(km)} км: для такой войны нужна мощь армии не меньше {int(START_POWER * need)} (сейчас {int(p.rep['power'])}).", "warn", p)
        return
    if p.war or q.war:
        await room.notice("Одна из сторон уже воюет: не больше одной войны одновременно.", "warn", p)
        return
    if p.vassal_of == q.id:
        left = max(0, VASSAL_LOCK - (room.month - p.vassal_since))
        await room.notice(f"Вассал не может воевать с сюзереном: ещё {left} мес. Потом можно заявить о независимости.", "warn", p)
        return
    if room.month < p.war_cd:
        await room.notice(f"Армия не готова к новой войне: ещё {p.war_cd - room.month} мес.", "warn", p)
        return
    if room.month < q.shield_until:
        await room.notice(f"{q.country} под защитой ещё {q.shield_until - room.month} мес.", "warn", p)
        return
    if p.pacts.get(q.id, 0) > room.month:
        await room.notice("Сначала нужно дождаться конца торгового пакта.", "warn", p)
        return
    await room.start_war(p, q)


async def on_peace(room: Room, p: Player, msg: dict):
    w = room.wars.get(p.war or "")
    if not w:
        return
    other = room.ent(w["d"] if w["a"] == p.id else w["a"])
    if not other:
        return
    if other.ai:
        front_ai = (100 - w["p"]) if w["a"] == p.id else w["p"]
        if front_ai >= 45 or w["m"] >= 8:
            await room.end_war(w, "peace")
        else:
            await room.notice(f"{other.country} отказывается от мира: он ещё надеется переломить ход войны.", "warn", p)
        return
    if msg.get("accept") and w.get("peace_from") == other.id:
        await room.end_war(w, "peace")
        return
    if not msg.get("accept"):
        w["peace_from"] = p.id
        await room.send(other, {"type": "peace_offer", "from": p.country})
        await room.notice("Предложение мира отправлено.", "info", p)


async def on_dictate(room: Room, p: Player, msg: dict):
    w = room.wars.get(p.war or "")
    if not w:
        return
    other = room.ent(w["d"] if w["a"] == p.id else w["a"])
    mode = msg.get("mode")
    if not other or mode not in ("tribute", "vassal", "region", "annex"):
        return
    front = w["p"] if w["a"] == p.id else 100 - w["p"]
    won = w.get("won") == p.id
    if w.get("won") and not won:
        await room.notice("Противник разгромил вас — условия диктует он.", "warn", p)
        return
    if not won and front < DICTATE_FRONT:
        await room.notice(f"Диктовать условия можно при перевесе от {DICTATE_FRONT}% (сейчас {int(front)}%).", "warn", p)
        return
    if mode == "region" and not won and front < REGION_FRONT:
        await room.notice(f"Отторгнуть область можно при перевесе от {REGION_FRONT}%.", "warn", p)
        return
    if mode == "annex" and not won:
        await room.notice("Полный захват — только при полной победе (100% на фронте).", "warn", p)
        return
    if mode == "region" and other.regions_lost >= MAX_REGIONS_LOST:
        await room.notice(f"У {other.country} уже отняли {MAX_REGIONS_LOST} области — больше нельзя.", "warn", p)
        return
    if mode == "vassal":
        if len(room.active_vassals(p)) >= MAX_VASSALS:
            await room.notice(f"У вас уже {MAX_VASSALS} вассала — это максимум.", "warn", p)
            return
        if p.vassal_of or other.vassal_of:
            await room.notice("Вассалом не может стать тот, кто сам вассал или имеет сюзерена.", "warn", p)
            return
    await room.resolve(w, p, other, mode)


async def on_cede(room: Room, p: Player, msg: dict):
    pend = room.cedes.pop(p.id, None)
    if not pend:
        return
    win = room.players.get(pend["to"])
    if not win or win.eliminated:
        return
    r = msg.get("region") or {}
    if msg.get("none") or not r.get("name"):
        amount = int(min(1500, 600 + p.rep["gdp"] * 0.012, max(0, p.rep["money"]) * 0.25))
        p.regions_lost = max(0, p.regions_lost - 1)
        await room.send(win, {"type": "war_end", "result": "win", "enemy": p.country, "money": amount, "approval": 0, "stability": 0})
        await room.send(p, {"type": "war_end", "result": "lose", "enemy": win.country, "money": -amount, "approval": 0, "stability": 0})
        await room.notice(f"У {p.country} нет области для передачи — вместо неё контрибуция {amount} млн.", "war")
        return
    pop = int(num(r.get("pop"), 0, p.rep["pop"] * 0.35, 0))
    gdp = int(min(p.rep["gdp"] * 0.3, p.rep["gdp"] * pop / max(1.0, p.rep["pop"]) * 0.8))
    name = f"{clean_name(r.get('name'), 'Область', 24)} ({p.country})"[:40]
    await room.send(win, {"type": "region_gain", "kind": "region", "from": p.country, "iso": p.iso,
                          "region": {"name": name, "from": p.country, "pop": pop, "gdp": gdp, "full": False,
                                     "wealth": num(r.get("wealth"), 0, 100, 40), "industry": num(r.get("industry"), 0, 100, 36),
                                     "infra": num(r.get("infra"), 0, 100, 34), "resource": clean_name(r.get("resource"), "Захвачено", 16),
                                     "res": clean_res(r.get("res"))}})


async def on_independence(room: Room, p: Player):
    if not p.vassal_of:
        await room.notice("Вы не вассал.", "warn", p)
        return
    left = VASSAL_LOCK - (room.month - p.vassal_since)
    if left > 0:
        await room.notice(f"Заявить о независимости можно через {left} мес. (4 года вассалитета).", "warn", p)
        return
    lord = room.ent(p.vassal_of)
    if not lord or lord.eliminated:
        p.vassal_of = None
        return
    if p.war or lord.war:
        await room.notice("Нельзя начать войну за независимость, пока идёт другая война.", "warn", p)
        return
    await room.declare_independence(p)


async def on_release(room: Room, p: Player, msg: dict):
    """Сюзерен добровольно отпускает вассала."""
    q = room.ent(str(msg.get("to", "")))
    if not q or q.vassal_of != p.id:
        return
    q.vassal_of = None
    p.vassals.pop(q.id, None)
    await room.world_event(f"🕊 {p.country} добровольно даёт независимость государству {q.country}.", "diplomacy")


async def on_vote(room: Room, p: Player, msg: dict):
    v = room.votes.get(str(msg.get("id", "")))
    if not v or p.id in (v["actor"], v["target"]):
        return
    v["yes"].discard(p.id)
    v["no"].discard(p.id)
    (v["yes"] if msg.get("value") == "approve" else v["no"]).add(p.id)
    await room.notice("Ваш голос учтён.", "info", p)


async def on_settlement(room: Room, p: Player, msg: dict):
    choice = msg.get("choice")
    r = next((x for x in room.rebellions.values() if x["owner"] == p.id and x["region"] == msg.get("region") and x.get("waiting")), None)
    if not r or choice not in ("reintegrate", "autonomy", "independence"):
        return
    await room.finish_rebellion(r, p, choice)


# ------------------------------------------------------------------ WebSocket
async def nations_socket(ws: WebSocket, code: str):
    await ws.accept()
    code = "".join(ch for ch in code.upper() if ch.isalnum())[:8] or new_code()
    room = NROOMS.get(code)
    me = None
    try:
        while True:
            msg = await ws.receive_json()
            if not isinstance(msg, dict):
                continue
            if me is None:
                if msg.get("type") != "join":
                    continue
                rejoin = bool(msg.get("rejoin"))
                if room is None:
                    if rejoin:
                        await ws.send_json({"type": "error", "fatal": True, "text": "Комната больше не существует."})
                        await ws.close()
                        return
                    room = NROOMS.setdefault(code, Room(code))
                name = clean_name(msg.get("name"))
                token = str(msg.get("token", ""))[:40]
                created_new = False
                me = next((x for x in room.players.values() if token and x.id == token), None)
                if me:
                    me.ws = ws
                    me.connected = True
                elif rejoin:
                    await ws.send_json({"type": "error", "fatal": True, "text": "Сессия не найдена в этой комнате."})
                    await ws.close()
                    return
                elif room.state == "finished":
                    await ws.send_json({"type": "error", "text": "Эта игра уже завершена."})
                    await ws.close()
                    return
                elif len(room.players) >= MAX_PLAYERS:
                    await ws.send_json({"type": "error", "text": f"Комната заполнена ({MAX_PLAYERS} игроков)."})
                    await ws.close()
                    return
                else:
                    pid = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
                    me = Player(ws, pid, name, "")
                    iso = str(msg.get("iso", "")).upper() or None
                    if not room.assign_country(me, iso) and not room.assign_country(me, None):
                        await ws.send_json({"type": "error", "text": "Нет свободных стран."})
                        await ws.close()
                        return
                    custom = clean_name(msg.get("country"), "", 28)
                    me.country = custom or CINFO[me.iso]["ru"]
                    created_new = True
                    me.joined_month = room.month
                    room.players[pid] = me
                    if room.host is None:
                        room.host = pid
                late = created_new and room.state in ("running", "paused")
                await ws.send_json({"type": "joined", "id": me.id, "host": room.host == me.id, "new_player": bool(late),
                                    **room.lobby_info(), "wars": [room.war_pub(w) for w in room.wars.values()],
                                    "rebellions": [room.rebellion_pub(r) for r in room.rebellions.values()]})
                if room.state == "paused" and room.auto_paused:
                    room.auto_paused = False
                    room.state = "running"
                    room.task = asyncio.create_task(room.run())
                    await room.broadcast({"type": "paused", "value": False})
                await room.push_lobby()
                if late:
                    me.joined_month = room.month
                    me.last_report = room.month
                    me.shield_until = room.month + NEWBIE_SHIELD
                    me.rep["money"] = room.start_money
                    me.score_gdp = START_GDP
                    room.compute_score(me)
                    await room.send(me, {"type": "start", "diff": room.diff, "length": room.length, "speed": room.speed,
                                         "month": room.month, "late_join": True, "iso": me.iso,
                                         "players": [q.pub() for q in room.players.values()],
                                         "standings": room.ranking_pub(), "world": room.world_pub()})
                if created_new and room.state != "lobby":
                    await room.world_event(f"🌍 Новое государство «{me.country}» появилось в мире.")
                    if room.state == "paused":
                        await room.send(me, {"type": "paused", "value": True})
                pend = room.cedes.get(me.id)
                if pend and room.state != "lobby":
                    w_ = room.players.get(pend["to"])
                    await ws.send_json({"type": "cede_request", "to": pend["to"], "kind": "region", "country": w_.country if w_ else ""})
                continue
            await handle(room, me, msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        import traceback
        traceback.print_exc()
    finally:
        if room and me:
            me.connected = False
            if room.state == "lobby":
                room.release_country(me)
                room.players.pop(me.id, None)
                if room.host == me.id:
                    room.host = next(iter(room.players), None)
            elif room.host == me.id:
                nxt = next((p for p in room.players.values() if p.connected), None)
                room.host = nxt.id if nxt else room.host
            await room.push_lobby()
            if not any(p.connected for p in room.players.values()):
                if room.task:
                    room.task.cancel()
                asyncio.get_event_loop().call_later(600, lambda: _gc(code))


def _gc(code: str):
    room = NROOMS.get(code)
    if room and not any(p.connected for p in room.players.values()):
        NROOMS.pop(code, None)
