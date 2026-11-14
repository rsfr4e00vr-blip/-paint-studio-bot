"""Мультиплеер «Симулятор государства»: комнаты, общие часы, дипломатия игроков.

Каждый игрок управляет своей страной в браузере (вся экономика считается на клиенте),
а сервер отвечает за то, что должно быть общим и честным:
  * единые часы: все получают «следующий месяц» одновременно;
  * публичная таблица очков (считается на сервере и ограничена по темпу роста);
  * переводы, торговые пакты, санкции и войны между игроками с правилами баланса.
"""
import asyncio
import math
import random
import string
import time

from fastapi import WebSocket, WebSocketDisconnect

NROOMS: dict = {}

# ------------------------------------------------------------------ настройки
MAX_PLAYERS = 6
SPEEDS = {"slow": 10.0, "normal": 6.0, "fast": 3.5}          # секунд на игровой месяц
LENGTHS = {"short": 120, "normal": 180, "long": 240}          # месяцев (10 / 15 / 20 лет)
DIFFS = {"story", "easy", "normal", "hard", "expert"}
# Настройки ИИ-противников задаёт хозяин комнаты: они ОДИНАКОВЫ для всех игроков (честная игра)
AI_AGGR = {"calm", "normal", "high", "extreme"}
AI_NN = {"off", "std", "fast"}
AI_ARS = {"none", "small"}
AI_DEFAULT = {"aggr": "normal", "nn": "std", "ars": "none"}
IDEOLOGIES = {"прагматизм", "либеральный курс", "государственный курс", "национальный курс", "традиционализм", "религиозный курс"}
WAR_CAUSES = {"territorial": "Территориальные претензии", "border": "Пограничный конфликт", "ideology": "Религиозный / идеологический конфликт", "economic": "Экономический конфликт"}

NEWBIE_SHIELD = 24        # первые 24 мес. нельзя объявлять войну
WAR_COOLDOWN = 18         # агрессор ждёт 18 мес. после своей войны
PEACE_SHIELD = 12         # после войны защитника 12 мес. не трогают
WAR_MAX_MONTHS = 24       # затяжная война без перевеса заканчивается ничьёй
DICTATE_FRONT = 60        # от этого перевеса на фронте можно диктовать условия
REGION_FRONT = 70         # отторжение области
WON_GRACE = 3             # после полной победы 3 мес. на выбор условий, иначе контрибуция
VASSAL_MONTHS = 24
VASSAL_TAKE = 0.10        # вассал отдаёт 10% дохода
VASSAL_GAIN = 0.07        # сюзерен получает 7% (меньше, чем теряет вассал)
MAX_REGIONS_LOST = 2      # у страны нельзя отнять больше двух областей за игру
AID_MAX_SHARE = 0.25      # перевод ≤ 25% казны отправителя
AID_FEE = 0.15            # комиссия на переводе (против сговора и фарма)
AID_COOLDOWN = 6          # один и тот же получатель — раз в 6 мес.
PACT_MONTHS = 12
PACT_BONUS = 0.04         # +4% дохода за каждый пакт
PACT_MAX = 2
SANCTION_MONTHS = 6
SANCTION_DMG = 0.05       # -5% дохода цели
SANCTION_SELF = 0.01      # -1% дохода инициатора
SANCTION_COOLDOWN = 12
SANCTION_CAP = 0.10       # суммарный штраф от санкций не больше 10%
PROPOSAL_TTL = 30.0       # секунд на ответ

# Баланс «резиновой ленты»: последнему +5% дохода, лидеру −3%
RUBBER_LAST = 0.05
RUBBER_FIRST = -0.03

START_GDP = 42000.0
START_POWER = 100.0       # warPower() страны на старте (проверено симуляцией)
START_MONEY = {"story": 26000, "easy": 22000, "normal": 18000, "hard": 14500, "expert": 10500}
GDP_SCORE_CAP = 1.015     # зачётный ВВП растёт не быстрее 1.5% в месяц


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


class Player:
    def __init__(self, ws: WebSocket, pid: str, name: str, country: str, ideology: str = "прагматизм"):
        self.ws = ws
        self.id = pid
        self.name = name
        self.country = country
        self.ideology = ideology if ideology in IDEOLOGIES else "прагматизм"
        self.claims: dict = {}             # target id -> {created, expires, detail}
        self.border_cases: dict = {}       # target id -> {created, expires, severity, detail}
        self.ideology_cases: dict = {}     # target id -> {created, expires, detail}
        self.ultimatums: dict = {}         # target id -> {cause, created, deadline, expires}
        self.connected = True
        self.ready = False
        self.eliminated = False       # campaignOver на клиенте
        self.out = False              # в оппозиции
        self.joined_month = 0
        # публичные показатели (ограничены сервером)
        self.rep = {"gdp": START_GDP, "money": 18000.0, "debt": 0.0, "stab": 68.0,
                    "appr": 61.0, "legit": 70.0, "power": START_POWER, "pop": 8200000.0,
                    "trust": 70.0, "income": 800.0, "res": 70.0, "pvo": 0.0, "pp": 60.0, "infl": 5.0, "rate": 5.0}
        self.score_gdp = START_GDP    # «зачётный» ВВП: растёт не быстрее лимита
        self.score = 0.0
        self.comp = {}
        self.last_report = 0
        self.aid_cd: dict = {}        # pid -> month
        self.sanction_cd: dict = {}   # pid -> month
        self.war_cd = 0               # агрессор не может объявить до этого месяца
        self.shield_until = NEWBIE_SHIELD
        self.pacts: dict = {}         # pid -> month_end
        self.sanctions_in: list = []  # [{from, end}]
        self.sanctions_out: dict = {} # pid -> month_end
        self.sanctions_started: dict = {} # pid -> month_start
        self.war = None               # id войны
        self.vassal_of = None         # id сюзерена
        self.vassal_end = 0
        self.vassal_tax = 10          # процент дохода, который вассал платит сюзерену
        self.vassals: dict = {}       # id вассала -> конец срока
        self.regions_lost = 0
        # Двусторонние отношения между игроками: 0 = нейтралитет.
        self.relations: dict = {}
        self.diplomacy_cd: dict = {}
        self.relation_programs: dict = {}  # opponent id -> {months_left, next_in}
        self.embassies: dict = {}          # opponent id -> {months_left, next_in}
        self.diplomacy_action_cd: dict = {}
        self.crisis_response: str | None = None

    def pub(self) -> dict:
        return {"id": self.id, "name": self.name, "country": self.country, "ideology": self.ideology,
                "connected": self.connected, "ready": self.ready,
                "eliminated": self.eliminated, "out": self.out,
                "score": round(self.score, 1), "comp": self.comp,
                "vassal_of": self.vassal_of, "vassal_tax": self.vassal_tax,
                "gdp": round(self.rep["gdp"]), "money": round(self.rep["money"]),
                "stab": round(self.rep["stab"]), "appr": round(self.rep["appr"]),
                "power": round(self.rep["power"], 1), "pop": round(self.rep["pop"]),
                "res": round(self.rep.get("res", 70)), "infl": round(self.rep.get("infl", 5), 1), "rate": round(self.rep.get("rate", 5), 1)}


class Room:
    def __init__(self, code: str):
        self.code = code
        self.players: dict = {}       # id -> Player
        self.host: str | None = None
        self.state = "lobby"          # lobby | running | paused | finished
        self.month = 0
        self.length = LENGTHS["normal"]
        self.speed = "normal"
        self.diff = "normal"
        self.ai = dict(AI_DEFAULT)
        self.auto_paused = False
        self.task: asyncio.Task | None = None
        self.proposals: dict = {}     # id -> dict
        self.cedes: dict = {}         # id проигравшего -> ожидающая передача области
        self.wars: dict = {}          # id -> dict
        self.chat: list = []
        self.created = now()
        self.winner = None
        self.final: list = []
        self.global_crisis: dict | None = None
        self.global_next = 12
        self.diplomacy_events: list = []

    # ---- рассылка
    async def send(self, p: Player, payload: dict):
        if not p.connected:
            return
        try:
            await p.ws.send_json(payload)
        except Exception:
            p.connected = False

    async def broadcast(self, payload: dict, exclude: str | None = None):
        for p in list(self.players.values()):
            if p.id != exclude:
                await self.send(p, payload)

    @property
    def start_money(self) -> float:
        return float(START_MONEY.get(self.diff, 18000))

    def alive(self):
        return [p for p in self.players.values() if not p.eliminated]

    def relations_for(self, p: Player) -> dict:
        return {q.id: int(p.relations.get(q.id, 0)) for q in self.players.values() if q.id != p.id}

    def programs_for(self, p: Player) -> dict:
        return {qid: dict(v) for qid, v in p.relation_programs.items()}

    def embassies_for(self, p: Player) -> dict:
        return {qid: dict(v) for qid, v in p.embassies.items()}

    def claims_for(self, p: Player) -> dict:
        return {qid: dict(v) for qid, v in p.claims.items() if v.get("expires", 0) > self.month}

    def border_cases_for(self, p: Player) -> dict:
        return {qid: dict(v) for qid, v in p.border_cases.items() if v.get("expires", 0) > self.month}

    def ideology_cases_for(self, p: Player) -> dict:
        return {qid: dict(v) for qid, v in p.ideology_cases.items() if v.get("expires", 0) > self.month}

    def diplomacy_grounds(self, p: Player, q: Player) -> dict:
        grounds = {}
        claim = p.claims.get(q.id)
        if claim and claim.get("expires", 0) > self.month and self.month - claim.get("created", self.month) >= 2:
            grounds["territorial"] = dict(claim)
        border = p.border_cases.get(q.id)
        if border and border.get("expires", 0) > self.month and (self.month - border.get("created", self.month) >= 2 or border.get("severity", 0) >= 85):
            grounds["border"] = dict(border)
        ideology = p.ideology_cases.get(q.id)
        if p.ideology != q.ideology and ideology and ideology.get("expires", 0) > self.month and (self.month - ideology.get("created", self.month) >= 2 or ideology.get("severity", 0) >= 85):
            grounds["ideology"] = dict(ideology)
        sanctioned = q.sanctions_out.get(p.id, 0) > self.month or any(x.get("from") == q.id and x.get("end", 0) > self.month for x in p.sanctions_in)
        sanction_start = q.sanctions_started.get(p.id, self.month)
        if sanctioned and self.month - sanction_start >= 2:
            grounds["economic"] = {"created": sanction_start, "expires": self.month + 6, "detail": "Санкции и экономическое давление", "severity": 86 if self.month - sanction_start >= 4 else 72}
        ultimatum = p.ultimatums.get(q.id)
        if ultimatum and ultimatum.get("expires", 0) > self.month:
            entry = grounds.get(ultimatum.get("cause"))
            if entry:
                entry["ultimatum"] = dict(ultimatum)
        return grounds

    def grounds_for(self, p: Player) -> dict:
        return {q.id: self.diplomacy_grounds(p, q) for q in self.players.values()
                if q.id != p.id and not q.eliminated}

    async def push_diplomacy_state(self):
        for p in self.players.values():
            await self.send(p, {"type": "diplomacy_state", "claims": self.claims_for(p),
                "border_cases": self.border_cases_for(p), "ideology_cases": self.ideology_cases_for(p),
                "war_grounds": self.grounds_for(p)})

    def process_ideology_crises(self):
        for p in self.players.values():
            for q in self.players.values():
                if p.id == q.id or p.eliminated or q.eliminated or p.war or q.war:
                    continue
                if p.ideology != q.ideology and p.relations.get(q.id, 0) <= -30:
                    old = p.ideology_cases.get(q.id)
                    if not old or old.get("expires", 0) <= self.month:
                        p.ideology_cases[q.id] = {"created": self.month, "expires": self.month + 24,
                            "detail": f"Идеологическое противостояние: {p.ideology} — {q.ideology}", "severity": 86 if p.relations.get(q.id, 0) <= -75 else 55}
            p.claims = {k: v for k, v in p.claims.items() if v.get("expires", 0) > self.month}
            p.border_cases = {k: v for k, v in p.border_cases.items() if v.get("expires", 0) > self.month}
            p.ideology_cases = {k: v for k, v in p.ideology_cases.items() if v.get("expires", 0) > self.month}
            p.ultimatums = {k: v for k, v in p.ultimatums.items() if v.get("expires", 0) > self.month}

    def lobby_info(self) -> dict:
        return {"code": self.code, "state": self.state, "host": self.host,
                "month": self.month, "length": self.length, "speed": self.speed,
                "diff": self.diff, "ai": self.ai, "players": [p.pub() for p in self.players.values()]}

    async def push_lobby(self):
        await self.broadcast({"type": "lobby", **self.lobby_info()})

    async def notice(self, text: str, kind: str = "info", to: Player | None = None):
        payload = {"type": "notice", "text": text, "kind": kind, "month": self.month}
        if to:
            await self.send(to, payload)
        else:
            await self.broadcast(payload)

    # ---- очки
    def compute_score(self, p: Player) -> None:
        r = p.rep
        g = max(0.05, p.score_gdp / START_GDP)
        # Логарифмическая шкала: ×1 → 30, ×2 → 60, ×4 → 90. Не насыщается при обычной игре.
        eco = max(0.0, min(100.0, 30.0 + 30.0 * math.log2(g)))
        # благосостояние: стабильность и одобрение + ресурсная обеспеченность (еда, топливо, энергия, сталь)
        welfare = max(0.0, min(100.0, r["stab"] * 0.4 + r["appr"] * 0.4 + r.get("res", 70.0) * 0.2))
        gov = max(0.0, min(100.0, (r["legit"] * 0.5 + r["trust"] * 0.5)))
        net = r["money"] - r["debt"]
        fin = max(0.0, min(100.0, 50 + (net - self.start_money) / 400))   # ±20000 млн от старта = край шкалы
        mil = max(0.0, min(100.0, r["power"] / START_POWER * 40))          # потолок при ×2.5 мощи
        score = eco * 0.36 + welfare * 0.20 + gov * 0.14 + fin * 0.14 + mil * 0.16
        if p.out:
            score *= 0.6
        if p.eliminated:
            score *= 0.4
        p.comp = {"eco": round(eco), "welfare": round(welfare), "gov": round(gov),
                  "fin": round(fin), "mil": round(mil)}
        p.score = score

    def ranking(self):
        return sorted(self.players.values(), key=lambda x: -x.score)

    def rubber(self, p: Player) -> float:
        """Доля дохода: +5% последнему … −3% лидеру. Работает при ≥3 живых игроках."""
        live = [x for x in self.players.values() if not x.eliminated]
        if len(live) < 3 or p.eliminated:
            return 0.0
        order = sorted(live, key=lambda x: -x.score)
        idx = order.index(p) if p in order else 0
        t = idx / (len(order) - 1)     # 0 лидер … 1 последний
        return RUBBER_FIRST + (RUBBER_LAST - RUBBER_FIRST) * t

    def income_mod(self, p: Player) -> dict:
        pacts = sum(1 for _, end in p.pacts.items() if end > self.month)
        pact = PACT_BONUS * min(pacts, PACT_MAX)
        sanc = min(SANCTION_CAP, SANCTION_DMG * sum(1 for s in p.sanctions_in if s["end"] > self.month))
        self_cost = SANCTION_SELF * sum(1 for _, end in p.sanctions_out.items() if end > self.month)
        rub = self.rubber(p)
        vas = 0.0
        if p.vassal_of and p.vassal_end > self.month:
            vas -= p.vassal_tax / 100.0
        vas += sum((self.players[k].vassal_tax / 100.0) * 0.70 for k, end in p.vassals.items() if end > self.month and k in self.players)
        return {"pact": round(pact, 4), "sanction": round(-sanc - self_cost, 4),
                "rubber": round(rub, 4), "vassal": round(vas, 4),
                "total": round(pact - sanc - self_cost + rub + vas, 4)}

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
        if len(self.players) >= 2 and len(self.alive()) <= 1:
            return True
        return False

    def multiplayer_diplomacy(self, p: Player) -> dict:
        """Compact bilateral diplomacy signals consumed by the shared client economy model."""
        others = [q for q in self.players.values() if q.id != p.id and not q.eliminated]
        vals = [float(p.relations.get(q.id, 0)) for q in others]
        active_pacts = sum(1 for _, end in p.pacts.items() if end > self.month)
        active_sanctions = sum(1 for item in p.sanctions_in if item.get("end", 0) > self.month)
        active_wars = sum(1 for w in self.wars.values() if p.id in (w.get("a"), w.get("d")))
        # Trade partners are represented by friendly, non-sanctioned bilateral relations.
        trade = sum(1 for q in others if p.relations.get(q.id, 0) >= 25 and
                    p.sanctions_out.get(q.id, 0) <= self.month and
                    not any(x.get("from") == q.id and x.get("end", 0) > self.month for x in p.sanctions_in))
        return {"tradePartners": trade, "allies": sum(1 for q in others if p.pacts.get(q.id, 0) > self.month),
                "pacts": active_pacts, "sanctions": active_sanctions + sum(1 for _, end in p.sanctions_out.items() if end > self.month),
                "wars": active_wars, "participants": len(others), "relationAvg": round(sum(vals) / len(vals), 1) if vals else 0}

    async def tick(self):
        self.month += 1
        self.process_global_crisis()
        self.process_ideology_crises()
        await self.process_wars()
        self.process_relation_programs()
        await self.process_embassies()
        self.expire()
        await self.check_vassal_rebellions()
        for p in self.players.values():
            self.compute_score(p)
        order = self.ranking()
        mods = {p.id: self.income_mod(p) for p in self.players.values()}
        await self.broadcast({
            "type": "tick", "month": self.month, "length": self.length,
            "standings": [p.pub() for p in order], "mods": mods,
            "mp_diplomacy": {q.id: self.multiplayer_diplomacy(q) for q in self.players.values()},
            "wars": [self.war_pub(w) for w in self.wars.values()],
            "relations": {q.id: self.relations_for(q) for q in self.players.values()},
            "relation_programs": {q.id: self.programs_for(q) for q in self.players.values()},
            "embassies": {q.id: self.embassies_for(q) for q in self.players.values()},
            "claims": {q.id: self.claims_for(q) for q in self.players.values()},
            "border_cases": {q.id: self.border_cases_for(q) for q in self.players.values()},
            "ideology_cases": {q.id: self.ideology_cases_for(q) for q in self.players.values()},
            "war_grounds": {q.id: self.grounds_for(q) for q in self.players.values()},
            "global_crisis": dict(self.global_crisis) if self.global_crisis else None,
            "global_next": self.global_next,
            "crisis_responses": {q.id: bool(self.global_crisis and q.crisis_response == self.global_crisis.get("id")) for q in self.players.values()},
        })

    def process_global_crisis(self):
        """Один общий мировой кризис для всех участников комнаты."""
        durations = {"energy": 6, "bank": 5, "food": 7, "health": 6, "shipping": 5}
        if not self.global_crisis:
            if self.month >= self.global_next and random.random() < 0.12:
                crisis_id = random.choice(list(durations))
                self.global_crisis = {"id": crisis_id, "left": durations[crisis_id], "age": 0}
                self.global_next = self.month + random.randint(18, 36)
                self.crisis_response = None
                # Each player has an independent response flag; reset it for the new event.
                for player in self.players.values():
                    player.crisis_response = None
                titles = {"energy": "Мировой энергетический шок", "bank": "Международная банковская паника",
                          "food": "Мировой продовольственный кризис", "health": "Глобальная чрезвычайная ситуация в здравоохранении",
                          "shipping": "Кризис международной логистики"}
                # Event is announced in the normal tick feed by clients.
            return
        self.global_crisis["age"] = int(self.global_crisis.get("age", 0)) + 1
        self.global_crisis["left"] = max(0, int(self.global_crisis.get("left", 0)) - 1)
        if self.global_crisis["left"] <= 0:
            self.global_crisis = None

    def process_relation_programs(self):
        """Four-year diplomatic program: +5 relations every five peaceful months."""
        for p in self.players.values():
            for qid, program in list(p.relation_programs.items()):
                q = self.players.get(qid)
                if not q or p.eliminated or q.eliminated:
                    p.relation_programs.pop(qid, None)
                    continue
                if p.war or q.war:
                    continue  # pause while the two countries are at war
                program["months_left"] = max(0, int(program.get("months_left", 0)) - 1)
                program["next_in"] = max(0, int(program.get("next_in", 5)) - 1)
                if program["next_in"] == 0:
                    p.relations[q.id] = int(num(p.relations.get(q.id, 0) + 5, -100, 100, 0))
                    q.relations[p.id] = int(num(q.relations.get(p.id, 0) + 5, -100, 100, 0))
                    program["next_in"] = 5
                if program["months_left"] <= 0:
                    p.relation_programs.pop(qid, None)

    async def check_vassal_rebellions(self):
        """Чем выше дань и слабее стабильность вассала, тем выше шанс выхода из вассалитета."""
        for v in list(self.players.values()):
            if not v.vassal_of or v.vassal_end <= self.month:
                continue
            lord = self.players.get(v.vassal_of)
            if not lord:
                v.vassal_of = None
                continue
            tax = max(0, min(40, int(v.vassal_tax)))
            stab = float(v.rep.get("stab", 60))
            # До 10% налог почти безопасен; 40% при низкой стабильности — серьёзный риск.
            chance = max(0.0, tax - 10) * 0.0015 + max(0.0, 55 - stab) * 0.0012
            chance = min(0.065, chance)
            if random.random() < chance:
                lord.vassals.pop(v.id, None)
                v.vassal_of = None
                v.vassal_end = 0
                v.vassal_tax = 10
                await self.notice(f"⚠️ {v.country} восстал и вышел из вассалитета страны {lord.country}!", "war")
                await self.send(lord, {"type": "vassal_revolt", "country": v.country, "side": "lord"})
                await self.send(v, {"type": "vassal_revolt", "country": lord.country, "side": "vassal"})

    def expire(self):
        for pid, pr in list(self.proposals.items()):
            if pr["exp"] < now():
                self.proposals.pop(pid, None)
        for p in self.players.values():
            p.sanctions_in = [s for s in p.sanctions_in if s["end"] > self.month]
            p.sanctions_out = {k: v for k, v in p.sanctions_out.items() if v > self.month}
            p.pacts = {k: v for k, v in p.pacts.items() if v > self.month}
            p.vassals = {k: v for k, v in p.vassals.items() if v > self.month}
            if p.vassal_of and p.vassal_end <= self.month:
                p.vassal_of = None

    async def finish(self):
        self.state = "finished"
        for p in self.players.values():
            self.compute_score(p)
        order = self.ranking()
        self.final = [p.pub() for p in order]
        self.winner = order[0].id if order else None
        await self.broadcast({"type": "final", "standings": self.final, "winner": self.winner,
                              "month": self.month})

    # ---- войны
    def war_pub(self, w: dict) -> dict:
        return {"id": w["id"], "a": w["a"], "d": w["d"], "p": round(w["p"]), "m": w["m"],
                "cause": w.get("cause"), "cause_label": WAR_CAUSES.get(w.get("cause"), ""), "reason": w.get("reason", ""), "won": w.get("won"), "wm": w.get("wm", 0), "orders": w.get("orders", {}), "econ": w.get("econ", {})}

    async def process_embassies(self):
        """Посольства: 20 млн ежемесячно, +2 к отношениям каждые 4 активных месяца."""
        changed = False
        for p in self.players.values():
            for qid, embassy in list(p.embassies.items()):
                q = self.players.get(qid)
                if not q or p.eliminated or q.eliminated:
                    p.embassies.pop(qid, None)
                    changed = True
                    continue
                if p.war and p.war == q.war:
                    embassy["paused"] = True
                    continue
                if p.rep.get("money", 0) < 20:
                    embassy["paused"] = True
                    continue
                p.rep["money"] -= 20
                await self.send(p, {"type": "mp_adjust", "money": -20})
                embassy["paused"] = False
                embassy["months_left"] = max(0, int(embassy.get("months_left", 0)) - 1)
                embassy["next_in"] = max(0, int(embassy.get("next_in", 4)) - 1)
                if embassy["next_in"] == 0:
                    for side, other in ((p, q), (q, p)):
                        old_rel = int(side.relations.get(other.id, 0))
                        gain = 2 if old_rel < 30 else 1 if old_rel < 60 else 0
                        side.relations[other.id] = int(num(old_rel + gain, -100, 100, 0))
                    embassy["next_in"] = 4
                    changed = True
                if embassy["months_left"] <= 0:
                    p.embassies.pop(qid, None)
                    await self.notice(f"🏛 Посольство {p.country} в стране {q.country} завершило работу.", "dip")
                    changed = True
        if changed:
            await self.broadcast({"type": "relations", "relations": {x.id: self.relations_for(x) for x in self.players.values()}})


    async def process_wars(self):
        for wid, w in list(self.wars.items()):
            a, d = self.players.get(w["a"]), self.players.get(w["d"])
            if not a or not d or a.eliminated or d.eliminated:
                await self.end_war(w, "cancel")
                continue
            w["m"] += 1
            pa = max(1.0, a.rep["power"]) * (0.8 + a.rep["appr"] / 250)
            pd = max(1.0, d.rep["power"]) * 1.15 * (0.8 + d.rep["appr"] / 250)
            # Построенное ПВО усиливает защиту в сетевой войне; значение приходит из игрового отчёта.
            pd *= 1.0 + min(0.12, max(0.0, d.rep.get("pvo", 0.0)) * 0.0012)
            if w.get("orders", {}).get(d.id, {}).get("air") == "defense":
                pd *= 1.045  # отдельный приказ ПВО обороняющейся стороне
            orders = w.get("orders", {})
            oa, od = orders.get(a.id, {}), orders.get(d.id, {})
            def op_bonus(o, defending=False):
                troops = num(o.get("troops"), 0, 1_000_000, 0)
                air = {"support": 0.035, "patrol": 0.018, "defense": 0.0, "reserve": 0.0, "strategic": 0.012}.get(o.get("air"), 0.0)
                navy = {"escort": 0.025, "blockade": 0.018, "reserve": 0.0}.get(o.get("navy"), 0.0)
                spec = {"recon": 0.012, "sabotage": 0.018, "reserve": 0.0}.get(o.get("spec"), 0.0)
                logistics = {"convoys": 0.015, "repair": 0.008, "reserve": 0.0}.get(o.get("logi"), 0.0)
                preset = o.get("preset")
                plan_bonus = {"assault": 0.055 if not defending else 0.01,
                              "balanced": 0.03, "defense": 0.045 if defending else 0.0,
                              "economy": 0.005, "pressure": 0.018}.get(preset, 0.0)
                return min(0.16, troops / 1_000_000 * 0.04 + air + navy + spec + logistics + plan_bonus)
            pa *= 1 + op_bonus(oa, defending=False)
            pd *= 1 + op_bonus(od, defending=True)
            # ПВО даёт дополнительный бонус именно обороняющейся стороне.
            if od.get("air") == "defense":
                pd *= 1.035
            if oa.get("air") == "defense":
                pa *= 1.035
            delta = (pa - pd) / (pa + pd) * 11 + random.uniform(-2.5, 2.5)
            w["p"] = max(0.0, min(100.0, w["p"] + max(-7.0, min(7.0, delta))))
            # Игровые индексы ущерба экономике: 100 = довоенный уровень, не реальные котировки.
            econ = w.setdefault("econ", {a.id: {"gdp": 100.0, "fx": 100.0},
                                         d.id: {"gdp": 100.0, "fx": 100.0}})
            for side, front in ((a, w["p"]), (d, 100.0 - w["p"])):
                q = econ.setdefault(side.id, {"gdp": 100.0, "fx": 100.0})
                pressure = max(0.0, min(1.0, front / 100.0))
                enemy_orders = w.get("orders", {}).get(d.id if side is a else a.id, {})
                pressure_plan = 0.0012 if enemy_orders.get("preset") == "pressure" else 0.0
                q["gdp"] = max(25.0, q["gdp"] * (1.0 - (0.0025 + 0.006 * pressure + pressure_plan)))
                q["fx"] = min(500.0, q["fx"] * (1.0 + (0.004 + 0.009 * pressure + pressure_plan * 0.7)))
            # издержки обеим сторонам каждый месяц
            for side, enemy_ratio in ((a, pd / (pa + pd)), (d, pa / (pa + pd))):
                order = orders.get(side.id, {})
                plan_cost = {"assault": 140, "balanced": 75, "defense": 65, "economy": 20, "pressure": 125}.get(order.get("preset"), 0)
                loss_mult = 1.15 if order.get("preset") == "assault" else 1.0
                await self.send(side, {"type": "war_cost", "war": wid,
                                       "army_loss": int((300 + 900 * enemy_ratio) * loss_mult),
                                       "money": 100 + plan_cost, "approval": 0.15})
            # перевес на фронте: сообщаем один раз
            for side, front in ((a, w["p"]), (d, 100 - w["p"])):
                key = "hint_" + side.id
                if front >= DICTATE_FRONT and not w.get(key):
                    w[key] = True
                    await self.send(side, {"type": "dictate_open", "enemy": (d if side is a else a).country})
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
                if w["wm"] >= WON_GRACE:
                    win = self.players[w["won"]]
                    lose = d if win is a else a
                    await self.resolve(w, win, lose, "tribute")
                    continue
            if not w.get("won") and w["m"] >= WAR_MAX_MONTHS:
                await self.end_war(w, "draw")

    async def resolve(self, w: dict, win: Player, lose: Player, mode: str):
        """Условия мира, которые выбрал победитель на фронте."""
        front = w["p"] if win.id == w["a"] else 100 - w["p"]
        k = 1.0 if w.get("won") else 0.4 + 0.6 * front / 100
        if mode == "tribute":
            amount = int(min(1500, (500 + lose.rep["gdp"] * 0.012) * k, max(0, lose.rep["money"]) * 0.25))
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": amount, "approval": 3, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": -amount, "approval": -6, "stability": -5})
            await self.notice(f"💰 {lose.country} выплачивает контрибуцию стране {win.country}: {amount} млн.", "war")
        elif mode == "vassal":
            win.vassals[lose.id] = self.month + VASSAL_MONTHS
            lose.vassal_of, lose.vassal_end = win.id, self.month + VASSAL_MONTHS
            lose.vassal_tax = 10
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 4, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": 0, "approval": -6, "stability": -3})
            await self.notice(f"👑 {lose.country} стал вассалом страны {win.country} на {VASSAL_MONTHS} мес.", "war")
        elif mode == "region":
            self.cedes[lose.id] = {"to": win.id, "k": k, "kind": "region", "exp": self.month + 6}
            lose.regions_lost += 1
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 3, "stability": 0})
            await self.send(lose, {"type": "war_end", "result": "lose", "enemy": win.country, "money": 0, "approval": -2, "stability": 0})
            await self.send(lose, {"type": "cede_request", "to": win.id, "kind": "region", "country": win.country})
            await self.notice(f"🗺 {win.country} отторгает область у страны {lose.country}.", "war")
        elif mode == "annex":
            pop = int(lose.rep["pop"] * 0.5)
            gdp = int(lose.rep["gdp"] * 0.4)
            await self.send(win, {"type": "region_gain", "kind": "annex", "from": lose.country,
                                  "region": {"name": f"Земли {lose.country}", "from": lose.country, "pop": pop, "gdp": gdp, "full": True}})
            await self.send(lose, {"type": "annexed", "by": win.country})
            await self.send(win, {"type": "war_end", "result": "win", "enemy": lose.country, "money": 0, "approval": 4, "stability": -3})
            lose.eliminated = True
            self.compute_score(lose)
            await self.notice(f"🏴 {win.country} полностью захватил страну {lose.country}!", "war")
        self.wars.pop(w["id"], None)
        for p in (win, lose):
            p.war = None
        a = self.players.get(w["a"])
        if a:
            a.war_cd = self.month + WAR_COOLDOWN
        lose.shield_until = max(lose.shield_until, self.month + PEACE_SHIELD)
        win.shield_until = max(win.shield_until, self.month + 6)
        if self.should_finish():
            if self.task:
                self.task.cancel()
            await self.finish()

    async def end_war(self, w: dict, result: str):
        self.wars.pop(w["id"], None)
        a, d = self.players.get(w["a"]), self.players.get(w["d"])
        for p in (a, d):
            if p:
                p.war = None
        if not a or not d:
            return
        a.relations[d.id] = int(num(a.relations.get(d.id, 0) + (8 if result == "peace" else 3), -100, 100, 0))
        d.relations[a.id] = int(num(d.relations.get(a.id, 0) + (8 if result == "peace" else 3), -100, 100, 0))
        a.war_cd = self.month + WAR_COOLDOWN
        d.shield_until = max(d.shield_until, self.month + PEACE_SHIELD)
        a.shield_until = max(a.shield_until, self.month + 6)
        if result == "draw":
            for p, e in ((a, d), (d, a)):
                await self.send(p, {"type": "war_end", "result": "draw", "enemy": e.country,
                                    "money": 0, "approval": -2, "stability": 0})
            await self.notice(f"🕊 Война {a.country} и {d.country} закончилась ничьей.", "war")
        else:
            for p, e in ((a, d), (d, a)):
                await self.send(p, {"type": "war_end", "result": "peace", "enemy": e.country,
                                    "money": 0, "approval": 0, "stability": 0})
            await self.notice(f"🕊 {a.country} и {d.country} заключили мир.", "war")


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

    if kind == "settings" and room.state == "lobby" and p.id == room.host:
        if msg.get("speed") in SPEEDS:
            room.speed = msg["speed"]
        if msg.get("length") in LENGTHS:
            room.length = LENGTHS[msg["length"]]
        if msg.get("diff") in DIFFS:
            room.diff = msg["diff"]
        ai = msg.get("ai")
        if isinstance(ai, dict):
            if ai.get("aggr") in AI_AGGR:
                room.ai["aggr"] = ai["aggr"]
            if ai.get("nn") in AI_NN:
                room.ai["nn"] = ai["nn"]
            if ai.get("ars") in AI_ARS:
                room.ai["ars"] = ai["ars"]
        await room.push_lobby()
        return

    if kind == "start" and room.state == "lobby" and p.id == room.host:
        if len(room.players) < 2:
            await room.notice("Нужно минимум 2 игрока.", "warn", p)
            return
        room.state = "running"
        room.month = 0
        for q in room.players.values():
            q.eliminated = False
            q.rep["money"] = room.start_money
            q.score_gdp = START_GDP
            room.compute_score(q)
        await room.broadcast({"type": "start", "diff": room.diff, "ai": room.ai, "length": room.length,
                              "speed": room.speed, "players": [q.pub() for q in room.players.values()]})
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
        await room.send(p, {"type": "state", **room.lobby_info(), "wars": [room.war_pub(w) for w in room.wars.values()],
                            "mods": {q.id: room.income_mod(q) for q in room.players.values()},
                            "relations": room.relations_for(p), "relation_programs": room.programs_for(p),
                            "embassies": room.embassies_for(p), "claims": room.claims_for(p), "border_cases": room.border_cases_for(p), "ideology_cases": room.ideology_cases_for(p), "war_grounds": room.grounds_for(p), "global_crisis": dict(room.global_crisis) if room.global_crisis else None, "global_next": room.global_next,
                            "crisis_response": bool(room.global_crisis and p.crisis_response == room.global_crisis.get("id"))})
        return

    if room.state not in ("running", "paused"):
        return
    if p.eliminated:
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
    elif kind == "diplomacy":
        await on_diplomacy(room, p, msg)
    elif kind == "claim":
        await on_claim(room, p, msg)
    elif kind == "border_case":
        await on_border_case(room, p, msg)
    elif kind == "ultimatum":
        await on_ultimatum(room, p, msg)
    elif kind == "war":
        await on_war(room, p, msg)
    elif kind == "war_command":
        await on_war_command(room, p, msg)
    elif kind == "global_response":
        await on_global_response(room, p)
    elif kind == "peace":
        await on_peace(room, p, msg)
    elif kind == "dictate":
        await on_dictate(room, p, msg)
    elif kind == "vassal_tax":
        await on_vassal_tax(room, p, msg)
    elif kind == "cede":
        await on_cede(room, p, msg)


async def on_global_response(room: Room, p: Player):
    crisis = room.global_crisis
    if not crisis:
        await room.notice("Сейчас нет активного мирового кризиса.", "warn", p)
        return
    crisis_id = crisis.get("id")
    if p.crisis_response == crisis_id:
        await room.notice("Вы уже приняли ответные меры по этому кризису.", "warn", p)
        return
    costs = {"energy": 650, "bank": 500, "food": 400, "health": 600, "shipping": 450}
    cost = costs.get(crisis_id)
    if cost is None or p.rep.get("money", 0) < cost:
        await room.notice(f"Для ответных мер нужно {cost or 0} млн.", "warn", p)
        return
    p.rep["money"] -= cost
    p.crisis_response = crisis_id
    effects = {
        "energy": {"fuel": 9, "inflation": -0.5},
        "bank": {"trust": 9, "stability": 2},
        "food": {"food": 16, "approval": 1},
        "health": {"approval": 2, "health": 2},
        "shipping": {"fuel": 5, "steel": 4, "gdp": 120},
    }[crisis_id]
    await room.send(p, {"type": "mp_adjust", "money": -cost, "crisis_response": True, **effects})
    await room.notice(f"🌍 {p.country} принял ответные меры против мирового кризиса.", "info", p)


async def on_report(room: Room, p: Player, msg: dict):
    """Клиент присылает свои показатели. Сервер ограничивает скорость роста для таблицы очков."""
    r = msg.get("rep") or {}
    old = p.rep
    new = {
        "gdp": num(r.get("gdp"), 1000, 2_000_000, old["gdp"]),
        "money": num(r.get("money"), 0, 5_000_000, old["money"]),
        "debt": num(r.get("debt"), 0, 5_000_000, old["debt"]),
        "infl": num(r.get("infl"), 0, 100, old.get("infl", 5.0)),
        "rate": num(r.get("rate"), 0, 18, old.get("rate", 5.0)),
        "stab": num(r.get("stab"), 0, 100, old["stab"]),
        "appr": num(r.get("appr"), 0, 100, old["appr"]),
        "legit": num(r.get("legit"), 0, 100, old["legit"]),
        "trust": num(r.get("trust"), 0, 100, old["trust"]),
        "power": num(r.get("power"), 1, 100000, old["power"]),
        "pop": num(r.get("pop"), 100000, 2_000_000_000, old["pop"]),
        "income": num(r.get("income"), 0, 100000, old["income"]),
        "res": num(r.get("res"), 0, 100, old.get("res", 70.0)),
        "pvo": num(r.get("pvo"), 0, 1000, old.get("pvo", 0.0)),
        "pp": num(r.get("pp"), 0, 400, old.get("pp", 60.0)),
    }
    months = max(1, room.month - p.last_report)
    p.last_report = room.month
    # зачётный ВВП растёт не быстрее 1.5% в месяц (читерский рост в таблицу не попадёт)
    cap = p.score_gdp * (GDP_SCORE_CAP ** months)
    p.score_gdp = max(1000.0, min(new["gdp"], cap)) if new["gdp"] >= p.score_gdp else new["gdp"]
    # мощь тоже ограничена: не более +6% в месяц
    new["power"] = min(new["power"], old["power"] * (1.06 ** months) + 3)
    p.rep = new
    p.out = bool(msg.get("out"))
    room.compute_score(p)


def partner(room: Room, p: Player, msg: dict):
    q = room.players.get(str(msg.get("to", "")))
    if not q or q.id == p.id or q.eliminated:
        return None
    return q


async def on_aid(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
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
    p.relations[q.id] = int(num(p.relations.get(q.id, 0) + 4, -100, 100, 0))
    q.relations[p.id] = int(num(q.relations.get(p.id, 0) + 4, -100, 100, 0))
    got = int(amount * (1 - AID_FEE))
    await room.send(p, {"type": "aid_out", "amount": amount, "to": q.country})
    await room.send(q, {"type": "aid_in", "amount": got, "from": p.country})
    await room.notice(f"🤝 {p.country} направил помощь стране {q.country}.", "dip")


async def on_propose(room: Room, p: Player, msg: dict):
    """Торговый пакт: предложение → ответ другой стороны."""
    q = partner(room, p, msg)
    if not q:
        return
    if msg.get("what") != "pact":
        return
    active_p = sum(1 for e in p.pacts.values() if e > room.month)
    active_q = sum(1 for e in q.pacts.values() if e > room.month)
    if p.pacts.get(q.id, 0) > room.month:
        await room.notice("Пакт с этой страной уже действует.", "warn", p)
        return
    if active_p >= PACT_MAX or active_q >= PACT_MAX:
        await room.notice(f"У каждой страны не больше {PACT_MAX} торговых пактов.", "warn", p)
        return
    pid = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    room.proposals[pid] = {"id": pid, "what": "pact", "from": p.id, "to": q.id, "exp": now() + PROPOSAL_TTL}
    await room.send(q, {"type": "proposal", "id": pid, "what": "pact", "from": p.country,
                        "text": f"{p.country} предлагает торговый пакт на {PACT_MONTHS} мес.: +{int(PACT_BONUS*100)}% дохода обеим странам.",
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
    a.relations[p.id] = int(num(a.relations.get(p.id, 0) + 12, -100, 100, 0))
    p.relations[a.id] = int(num(p.relations.get(a.id, 0) + 12, -100, 100, 0))
    await room.notice(f"📜 Торговый пакт: {a.country} ↔ {p.country} на {PACT_MONTHS} мес.", "dip")


async def on_diplomacy(room: Room, p: Player, msg: dict):
    """Мирная дипломатия между игроками. Никакая третья страна не втягивается автоматически."""
    q = partner(room, p, msg)
    if not q:
        return
    action = msg.get("action")
    if action in ("meeting", "gift", "visit", "summit", "humanitarian", "education", "embassy"):
        if p.war or q.war:
            await room.notice("Дипломатические программы недоступны во время войны.", "warn", p)
            return
        costs = {"meeting": 200, "gift": 450, "visit": 180, "summit": 260, "humanitarian": 500, "education": 320, "embassy": 500}
        raw = {"meeting": 12, "gift": 10, "visit": 4, "summit": 5, "humanitarian": 8, "education": 4, "embassy": 2}
        cooldown = {"meeting": 3, "gift": 6, "visit": 5, "summit": 7, "humanitarian": 9, "education": 8, "embassy": 12}
        cost = costs[action]
        if p.diplomacy_action_cd.get((q.id, action), -999) + cooldown[action] > room.month:
            await room.notice("Это дипломатическое действие пока на перезарядке.", "warn", p)
            return
        if p.rep["money"] < cost:
            await room.notice(f"Для этого действия нужно {cost} млн.", "warn", p)
            return
        if action == "embassy":
            if len(p.embassies) >= 3:
                await room.notice("Можно содержать не более 3 зарубежных посольств.", "warn", p)
                return
            if q.id in p.embassies:
                await room.notice("Посольство в этой стране уже открыто.", "warn", p)
                return
            if p.relations.get(q.id, 0) < 0:
                await room.notice("Посольство можно открыть при отношениях от 0.", "warn", p)
                return
            p.embassies[q.id] = {"months_left": 24, "next_in": 4, "paused": False}
        p.rep["money"] -= cost
        p.diplomacy_action_cd[(q.id, action)] = room.month
        for side, other in ((p, q), (q, p)):
            old_rel = int(side.relations.get(other.id, 0))
            factor = 1.0 if old_rel < 30 else .75 if old_rel < 60 else .5 if old_rel < 80 else .25
            gain = max(1, round(raw[action] * factor))
            side.relations[other.id] = int(num(old_rel + gain, -100, 100, 0))
        if action == "humanitarian":
            p.rep["appr"] = num(p.rep.get("appr", 60) + 1, 0, 100, 60)
        await room.send(p, {"type": "mp_adjust", "money": -cost,
                            "approval": 1 if action == "humanitarian" else 0,
                            "tech": .35 if action == "education" else 0})
        labels = {"meeting": "дипломатическую встречу", "gift": "государственный подарок", "visit": "культурный обмен",
                  "summit": "саммит", "humanitarian": "гуманитарную помощь", "education": "образовательный обмен", "embassy": "посольство"}
        await room.notice(f"🤝 {p.country} и {q.country}: {labels[action]} проведены, отношения улучшены.", "dip")
    elif action == "neutral":
        if p.war or q.war:
            await room.notice("Нельзя восстановить нейтралитет во время войны — сначала заключите мир.", "warn", p)
            return
        if p.sanctions_out.get(q.id, 0) > room.month or any(x.get("from") == p.id and x.get("end", 0) > room.month for x in q.sanctions_in):
            await room.notice("Сначала дождитесь окончания взаимных санкций.", "warn", p)
            return
        p.relations[q.id] = 0
        q.relations[p.id] = 0
        await room.notice(f"⚖️ {p.country} и {q.country} восстановили нейтралитет.", "dip")
    elif action == "program":
        if p.war or q.war:
            await room.notice("Нельзя начать программу улучшения отношений во время войны.", "warn", p)
            return
        if q.id in p.relation_programs:
            await room.notice("Дипломатическая программа с этой страной уже действует.", "warn", p)
            return
        cost = 40
        if p.rep.get("pp", 60) < cost:
            await room.notice(f"Для программы нужно {cost} ⭐ политической власти.", "warn", p)
            return
        p.rep["pp"] = max(0, p.rep.get("pp", 60) - cost)
        p.relation_programs[q.id] = {"months_left": 48, "next_in": 5}
        await room.send(p, {"type": "pp_update", "pp": p.rep["pp"]})
        await room.notice(f"🤝 Запущена дипломатическая программа с {q.country} на 4 года: +5 к отношениям каждые 5 месяцев. Потрачено {cost} ⭐.", "dip", p)
    await room.broadcast({"type": "relations", "relations": {x.id: room.relations_for(x) for x in room.players.values()}})
    await room.broadcast({"type": "relation_programs", "relation_programs": {x.id: room.programs_for(x) for x in room.players.values()}})
    await room.broadcast({"type": "embassies", "embassies": {x.id: room.embassies_for(x) for x in room.players.values()}})


async def on_sanction(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
        return
    if p.sanction_cd.get(q.id, -99) + SANCTION_COOLDOWN > room.month:
        await room.notice("Санкции против этой страны уже вводились недавно.", "warn", p)
        return
    if p.sanctions_out.get(q.id, 0) > room.month:
        return
    p.sanction_cd[q.id] = room.month
    p.sanctions_started[q.id] = room.month
    end = room.month + SANCTION_MONTHS
    p.sanctions_out[q.id] = end
    q.sanctions_in.append({"from": p.id, "end": end})
    q.rep["trust"] = max(0, q.rep.get("trust", 70) - 1.5)
    # Sanctions have a limited diplomatic impact: they can push neutral relations
    # down to -30, but cannot by themselves drag an already worse relationship
    # upward or trigger a war. Other events (e.g. declaring war) have their own
    # independent relation effects.
    current_p = int(num(p.relations.get(q.id, 0), -100, 100, 0))
    current_q = int(num(q.relations.get(p.id, 0), -100, 100, 0))
    if current_p > -30:
        p.relations[q.id] = max(-30, current_p - 18)
    if current_q > -30:
        q.relations[p.id] = max(-30, current_q - 18)
    await room.notice(f"⛔ {p.country} ввёл санкции против {q.country} на {SANCTION_MONTHS} мес. Отношения из-за санкций не опустятся ниже −30.", "dip")
    await room.push_diplomacy_state()


async def on_claim(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
        return
    if p.war or q.war or p.pacts.get(q.id, 0) > room.month:
        await room.notice("Нельзя предъявить территориальную претензию во время войны или действующего пакта.", "warn", p)
        return
    if p.claims.get(q.id, {}).get("expires", 0) > room.month:
        await room.notice("Территориальная претензия уже действует.", "warn", p)
        return
    cost = 15
    if p.rep.get("pp", 0) < cost:
        await room.notice(f"Для официальной претензии нужно {cost} политической власти.", "warn", p)
        return
    p.rep["pp"] -= cost
    p.claims[q.id] = {"created": room.month, "expires": room.month + 36,
                      "detail": "Официальное требование пересмотра территориального статуса", "severity": 68}
    p.ultimatums.pop(q.id, None)
    p.relations[q.id] = int(num(p.relations.get(q.id, 0) - 6, -100, 100, 0))
    q.relations[p.id] = int(num(q.relations.get(p.id, 0) - 6, -100, 100, 0))
    await room.send(p, {"type": "pp_update", "pp": p.rep["pp"]})
    await room.notice(f"🗺 {p.country} предъявила {q.country} территориальную претензию. У сторон есть время для переговоров.", "dip")
    await room.broadcast({"type": "relations", "relations": {x.id: room.relations_for(x) for x in room.players.values()}})
    await room.push_diplomacy_state()


async def on_border_case(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
        return
    if p.war or q.war or p.pacts.get(q.id, 0) > room.month:
        await room.notice("Пограничный кризис нельзя открыть во время войны или пакта.", "warn", p)
        return
    if p.relations.get(q.id, 0) > 10:
        await room.notice("Для пограничного протеста нужны уже напряжённые отношения (не выше +10).", "warn", p)
        return
    if p.border_cases.get(q.id, {}).get("expires", 0) > room.month:
        await room.notice("Пограничный инцидент уже зарегистрирован.", "warn", p)
        return
    cost = 8
    if p.rep.get("pp", 0) < cost:
        await room.notice(f"Для расследования пограничного инцидента нужно {cost} политической власти.", "warn", p)
        return
    p.rep["pp"] -= cost
    p.border_cases[q.id] = {"created": room.month, "expires": room.month + 24,
                            "detail": "Зарегистрированное нарушение пограничного режима", "severity": 88 if p.relations.get(q.id, 0) <= -50 else 62}
    p.ultimatums.pop(q.id, None)
    p.relations[q.id] = int(num(p.relations.get(q.id, 0) - 5, -100, 100, 0))
    q.relations[p.id] = int(num(q.relations.get(p.id, 0) - 5, -100, 100, 0))
    await room.send(p, {"type": "pp_update", "pp": p.rep["pp"]})
    await room.notice(f"🚧 {p.country} зарегистрировала пограничный инцидент с {q.country}. Началось дипломатическое расследование.", "dip")
    await room.broadcast({"type": "relations", "relations": {x.id: room.relations_for(x) for x in room.players.values()}})
    await room.push_diplomacy_state()


async def on_ultimatum(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
        return
    cause = str(msg.get("cause", ""))
    grounds = room.diplomacy_grounds(p, q)
    ground = grounds.get(cause)
    if not ground:
        await room.notice("Для ультиматума нет действующего дипломатического основания.", "warn", p)
        return
    if ground.get("severity", 0) >= 85:
        await room.notice("Провокация настолько серьёзная, что ультиматум не обязателен — можно объявить войну сразу.", "warn", p)
        return
    if p.war or q.war or p.pacts.get(q.id, 0) > room.month:
        await room.notice("Нельзя выдвинуть ультиматум во время войны или действующего пакта.", "warn", p)
        return
    old = p.ultimatums.get(q.id)
    if old and old.get("expires", 0) > room.month and old.get("cause") == cause:
        await room.notice(f"Ультиматум уже действует. Осталось {max(0, old.get('deadline', room.month) - room.month)} мес.", "warn", p)
        return
    p.ultimatums[q.id] = {"cause": cause, "created": room.month, "deadline": room.month + 2,
                          "expires": room.month + 8, "detail": ground.get("detail", WAR_CAUSES[cause])}
    await room.notice(f"⚠️ {p.country} выдвинула {q.country} ультиматум по вопросу «{WAR_CAUSES[cause]}». На выполнение требований — 2 месяца.", "dip")
    await room.push_diplomacy_state()


async def on_war(room: Room, p: Player, msg: dict):
    q = partner(room, p, msg)
    if not q:
        return
    cause = str(msg.get("cause", ""))
    grounds = room.diplomacy_grounds(p, q)
    if cause not in WAR_CAUSES or cause not in grounds:
        available = ", ".join(WAR_CAUSES[k] for k in grounds) or "нет действующих оснований"
        await room.notice(f"Нельзя объявить войну без конкретного основания. Доступно: {available}.", "warn", p)
        return
    if room.month < p.shield_until and room.month < NEWBIE_SHIELD:
        await room.notice(f"Война запрещена до {NEWBIE_SHIELD}-го месяца (защита новичков).", "warn", p)
        return
    if p.war or q.war:
        await room.notice("Одна из сторон уже воюет: не больше одной войны одновременно.", "warn", p)
        return
    if p.vassal_of == q.id and p.vassal_end > room.month:
        await room.notice("Вассал не может воевать с сюзереном.", "warn", p)
        return
    if room.month < p.war_cd:
        await room.notice(f"Армия не готова к новой войне: ещё {p.war_cd - room.month} мес.", "warn", p)
        return
    if room.month < q.shield_until:
        await room.notice(f"{q.country} под защитой ещё {q.shield_until - room.month} мес.", "warn", p)
        return
    if p.pacts.get(q.id, 0) > room.month:
        await room.notice("Сначала нужно расторгнуть действующий торговый пакт.", "warn", p)
        return
    ground = grounds[cause]
    ultimatum = p.ultimatums.get(q.id)
    sudden = ground.get("severity", 0) >= 85
    if not sudden and not (ultimatum and ultimatum.get("cause") == cause and ultimatum.get("deadline", room.month + 1) <= room.month):
        await room.notice("Сначала выдвиньте ультиматум и дождитесь срока его выполнения. При серьёзной провокации (85/100) война возможна сразу.", "warn", p)
        return
    wid = "w" + "".join(random.choices(string.digits, k=5))
    room.wars[wid] = {"id": wid, "a": p.id, "d": q.id, "p": 50.0, "m": 0, "orders": {},
                      "cause": cause, "reason": ground.get("detail", WAR_CAUSES[cause])}
    p.war = q.war = wid
    p.claims.pop(q.id, None); p.border_cases.pop(q.id, None); p.ideology_cases.pop(q.id, None); p.ultimatums.pop(q.id, None)
    current_p = int(num(p.relations.get(q.id, 0), -100, 100, 0))
    current_q = int(num(q.relations.get(p.id, 0), -100, 100, 0))
    p.relations[q.id] = max(-45, current_p - 25)
    q.relations[p.id] = max(-45, current_q - 25)
    await room.send(p, {"type": "war_start", "war": wid, "enemy": q.country, "aggressor": True, "cause": cause, "cause_label": WAR_CAUSES[cause], "reason": ground.get("detail", "")})
    await room.send(q, {"type": "war_start", "war": wid, "enemy": p.country, "aggressor": False, "cause": cause, "cause_label": WAR_CAUSES[cause], "reason": ground.get("detail", "")})
    await room.notice(f"⚔️ {p.country} объявил войну стране {q.country}. Основание: {WAR_CAUSES[cause]}. Причина: {ground.get('detail', '')}.", "war")


async def on_war_command(room: Room, p: Player, msg: dict):
    """Серверная проверка и синхронизация стратегических приказов обеих сторон."""
    w = room.wars.get(p.war or "")
    if not w:
        await room.notice("Приказы доступны только во время войны.", "warn", p)
        return
    region = "".join(ch for ch in str(msg.get("region", "")) if ch.isprintable()).strip()[:60]
    troops = int(num(msg.get("troops"), 0, 1_000_000, 0))
    air = msg.get("air") if msg.get("air") in ("support", "patrol", "defense", "reserve", "strategic") else "reserve"
    navy = msg.get("navy") if msg.get("navy") in ("escort", "blockade", "reserve") else "reserve"
    spec = msg.get("spec") if msg.get("spec") in ("recon", "sabotage", "reserve") else "reserve"
    logi = msg.get("logi") if msg.get("logi") in ("convoys", "repair", "reserve") else "reserve"
    alloc = msg.get("alloc") if msg.get("alloc") in ("focus", "spread") else "focus"
    preset = msg.get("preset") if msg.get("preset") in ("assault", "balanced", "defense", "economy", "pressure") else "custom"
    w.setdefault("orders", {})[p.id] = {"region": region, "troops": troops, "air": air, "navy": navy,
        "spec": spec, "logi": logi, "alloc": alloc, "preset": preset}
    await room.broadcast({"type": "war_orders", "wars": [room.war_pub(x) for x in room.wars.values()]})
    await room.notice(f"📋 {p.country} обновил план армии: {preset}, {region or 'общий фронт'}, авиация — {air}, флот — {navy}.", "war")


async def on_peace(room: Room, p: Player, msg: dict):
    w = room.wars.get(p.war or "")
    if not w:
        return
    other_id = w["d"] if w["a"] == p.id else w["a"]
    other = room.players.get(other_id)
    if not other:
        return
    if msg.get("accept") and w.get("peace_from") == other_id:
        await room.end_war(w, "peace")
        return
    if not msg.get("accept"):
        w["peace_from"] = p.id
        await room.send(other, {"type": "peace_offer", "from": p.country})
        await room.notice("Предложение мира отправлено.", "info", p)


async def on_dictate(room: Room, p: Player, msg: dict):
    """Победитель на фронте сам выбирает условия: контрибуция, вассал, область, захват страны."""
    w = room.wars.get(p.war or "")
    if not w:
        return
    other = room.players.get(w["d"] if w["a"] == p.id else w["a"])
    if not other:
        return
    mode = msg.get("mode")
    if mode not in ("tribute", "vassal", "region", "annex"):
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
        if any(e > room.month for e in p.vassals.values()):
            await room.notice("У вас уже есть вассал: можно иметь только одного.", "warn", p)
            return
        if p.vassal_of or other.vassal_of:
            await room.notice("Вассалом не может стать тот, кто сам вассал или имеет сюзерена.", "warn", p)
            return
    await room.resolve(w, p, other, mode)


async def on_vassal_tax(room: Room, p: Player, msg: dict):
    """Сюзерен задаёт налог своему вассалу: 0–40% дохода."""
    try:
        vid = str(msg.get("vassal", ""))
        rate = int(num(msg.get("rate"), 0, 40, 10))
    except (TypeError, ValueError):
        return
    if vid not in p.vassals or p.vassals.get(vid, 0) <= room.month:
        await room.notice("Этот игрок больше не является вашим вассалом.", "warn", p)
        return
    v = room.players.get(vid)
    if not v or v.vassal_of != p.id:
        return
    v.vassal_tax = rate
    await room.send(p, {"type": "vassal_tax_set", "country": v.country, "rate": rate, "side": "lord"})
    await room.send(v, {"type": "vassal_tax_set", "country": p.country, "rate": rate, "side": "vassal"})
    await room.notice(f"💰 Сюзерен {p.country} установил дань для {v.country}: {rate}% дохода.", "dip")


async def on_cede(room: Room, p: Player, msg: dict):
    """Проигравший передаёт область победителю (клиент сам выбирает самую мятежную)."""
    pend = room.cedes.pop(p.id, None)
    if not pend or pend["exp"] < room.month:
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
    await room.send(win, {"type": "region_gain", "kind": "region", "from": p.country,
                          "region": {"name": name, "from": p.country, "pop": pop, "gdp": gdp,
                                     "wealth": num(r.get("wealth"), 0, 100, 40), "industry": num(r.get("industry"), 0, 100, 36),
                                     "infra": num(r.get("infra"), 0, 100, 34), "resource": clean_name(r.get("resource"), "Захвачено", 16)}})


# ------------------------------------------------------------------ WebSocket
async def nations_socket(ws: WebSocket, code: str):
    await ws.accept()
    code = "".join(ch for ch in code.upper() if ch.isalnum())[:8] or new_code()
    room = NROOMS.get(code)
    me: Player | None = None
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
                country = clean_name(msg.get("country"), "Новария", 28)
                token = str(msg.get("token", ""))[:40]
                # переподключение по токену
                me = next((x for x in room.players.values() if token and x.id == token), None)
                if me:
                    me.ws = ws
                    me.connected = True
                elif rejoin:
                    await ws.send_json({"type": "error", "fatal": True, "text": "Сессия не найдена в этой комнате."})
                    await ws.close()
                    return
                elif room.state != "lobby":
                    await ws.send_json({"type": "error", "text": "Игра уже идёт. Присоединиться можно только по прежнему токену."})
                    await ws.close()
                    return
                elif len(room.players) >= MAX_PLAYERS:
                    await ws.send_json({"type": "error", "text": f"Комната заполнена ({MAX_PLAYERS} игроков)."})
                    await ws.close()
                    return
                else:
                    pid = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
                    me = Player(ws, pid, name, country, str(msg.get("ideology", "прагматизм")))
                    me.joined_month = room.month
                    room.players[pid] = me
                    if room.host is None:
                        room.host = pid
                await ws.send_json({"type": "joined", "id": me.id, "host": room.host == me.id,
                                    **room.lobby_info(),
                                    "wars": [room.war_pub(w) for w in room.wars.values()], "relations": room.relations_for(me), "relation_programs": room.programs_for(me), "embassies": room.embassies_for(me), "claims": room.claims_for(me), "border_cases": room.border_cases_for(me), "ideology_cases": room.ideology_cases_for(me), "war_grounds": room.grounds_for(me), "global_crisis": dict(room.global_crisis) if room.global_crisis else None, "global_next": room.global_next,
                                    "crisis_response": bool(room.global_crisis and me.crisis_response == room.global_crisis.get("id"))})
                if room.state == "paused" and room.auto_paused:
                    room.auto_paused = False
                    room.state = "running"
                    room.task = asyncio.create_task(room.run())
                    await room.broadcast({"type": "paused", "value": False})
                await room.push_lobby()
                pend = room.cedes.get(me.id)
                if pend and room.state != "lobby":
                    w_ = room.players.get(pend["to"])
                    await ws.send_json({"type": "cede_request", "to": pend["to"], "kind": "region",
                                        "country": w_.country if w_ else ""})
                continue
            await handle(room, me, msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if room and me:
            me.connected = False
            if room.state == "lobby":
                room.players.pop(me.id, None)
                if room.host == me.id:
                    room.host = next(iter(room.players), None)
            else:
                if room.host == me.id:
                    nxt = next((p for p in room.players.values() if p.connected), None)
                    room.host = nxt.id if nxt else room.host
            await room.push_lobby()
            if not any(p.connected for p in room.players.values()):
                if room.task:
                    room.task.cancel()
                # комнату держим 10 минут для переподключения, затем удаляем
                asyncio.get_event_loop().call_later(600, lambda: _gc(code))


def _gc(code: str):
    room = NROOMS.get(code)
    if room and not any(p.connected for p in room.players.values()):
        NROOMS.pop(code, None)
