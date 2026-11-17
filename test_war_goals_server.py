"""Server-side tests: war goals (territory capture, regime change) in multiplayer."""
import asyncio
import sys
import types

try:  # в окружении без fastapi подставляем заглушку: тесту нужна только игровая логика комнаты
    import fastapi  # noqa: F401
except ImportError:
    fake = types.ModuleType("fastapi")
    fake.WebSocket = type("WebSocket", (), {})
    fake.WebSocketDisconnect = type("WebSocketDisconnect", (Exception,), {})
    sys.modules["fastapi"] = fake

import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


def make_room(code, month=40):
    room = ns.Room(code)
    room.state = "running"
    room.month = month
    a = ns.Player(FakeSocket(), "a", "А", "Альфа", "либеральный курс")
    b = ns.Player(FakeSocket(), "b", "Б", "Бета", "традиционализм")
    room.players = {a.id: a, b.id: b}
    a.shield_until = b.shield_until = 0
    a.relations[b.id] = b.relations[a.id] = -50
    return room, a, b


async def open_war(room, a, b, cause, goal, region=None):
    a.border_cases[b.id] = {"created": room.month - 5, "expires": room.month + 20, "severity": 90, "detail": "Инцидент"}
    a.ideology_cases[b.id] = {"created": room.month - 5, "expires": room.month + 20, "severity": 90, "detail": "Спор"}
    msg = {"to": b.id, "cause": cause, "goal": goal}
    if region:
        msg["region"] = region
    await ns.on_war(room, a, msg)


async def run():
    # 1. Цель «смена власти» принимается, попадает в публичные данные войны и сообщения
    room, a, b = make_room("GOAL1")
    await open_war(room, a, b, "ideology", "regime")
    assert a.war and b.war, "война должна начаться"
    w = next(iter(room.wars.values()))
    assert w["goal"] == "regime"
    pub = room.war_pub(w)
    assert pub["goal"] == "regime" and pub["goal_label"] == "Смена власти"
    assert any(m.get("type") == "war_start" and m.get("goal") == "regime" for m in b.ws.messages)
    start_a = next(m for m in a.ws.messages if m.get("type") == "war_start")
    start_b = next(m for m in b.ws.messages if m.get("type") == "war_start")
    assert start_a["wars"] == start_b["wars"], "оба игрока должны получить один и тот же снимок войны"
    assert start_a["wars"][0]["id"] == start_b["war"]
    assert any(m.get("type") == "war_state" and m.get("wars") == start_a["wars"] for m in a.ws.messages)

    # 1b. Нельзя создать войну против отключённого участника: иначе агрессор видит фантомную войну.
    room_off, a_off, b_off = make_room("OFFLINE")
    b_off.connected = False
    a_off.border_cases[b_off.id] = {"created": room_off.month - 5, "expires": room_off.month + 20,
                                    "severity": 90, "detail": "Инцидент"}
    await ns.on_war(room_off, a_off, {"to": b_off.id, "cause": "border", "goal": "tribute"})
    assert not room_off.wars and not a_off.war and not b_off.war
    assert any(m.get("type") == "notice" and "не в сети" in m.get("text", "") for m in a_off.ws.messages)

    # 2. Диктовать смену власти нельзя без перевеса, можно — при перевесе 60%
    w["p"] = 55.0
    await ns.on_dictate(room, a, {"mode": "regime"})
    assert a.war, "без перевеса условия не диктуются"
    w["p"] = 75.0
    await ns.on_dictate(room, a, {"mode": "regime"})
    assert not a.war and not b.war, "война закончена миром со сменой власти"
    assert b.ideology == "либеральный курс" and b.regime_prev == "традиционализм"
    assert b.regime_by == a.id and b.regime_end == 40 + ns.REGIME_MONTHS
    assert b.pub()["regime_by"] == a.id
    assert any(m.get("type") == "regime_change" and m.get("side") == "loser" for m in b.ws.messages)
    assert any(m.get("type") == "regime_change" and m.get("side") == "winner" for m in a.ws.messages)
    assert a.relations[b.id] >= 0 and b.relations[a.id] >= 0

    # 3. Режим опекаемой страны не может воевать с победителем и по итогу истекает
    room.month += 30
    room.expire()
    assert b.regime_by is None and b.regime_end == 0

    # 4. Контрпереворот при низкой стабильности/одобрении возвращает прежний курс
    room2, a2, b2 = make_room("COUP")
    b2.regime_prev, b2.regime_by, b2.regime_end = "традиционализм", a2.id, room2.month + 24
    b2.ideology = a2.ideology
    b2.rep["stab"], b2.rep["appr"] = 0.0, 0.0
    import random
    old = random.random
    random.random = lambda: 0.0
    try:
        await room2.check_regime_coups()
    finally:
        random.random = old
    assert b2.ideology == "традиционализм" and b2.regime_by is None
    assert any(m.get("side") == "coup" for m in b2.ws.messages)

    # 5. Смена власти без основания (курсы совпадают, отношения нормальные) запрещена
    room3, a3, b3 = make_room("NOREG")
    b3.ideology = a3.ideology
    a3.relations[b3.id] = b3.relations[a3.id] = -10
    await open_war(room3, a3, b3, "border", "regime")
    assert not a3.war, "цель «смена власти» недопустима при совпадающих курсах"

    # 6. Цель «захват территории»: область запоминается, порог для области снижен до 60%
    room4, a4, b4 = make_room("TERR")
    a4.claims[b4.id] = {"created": 30, "expires": 100, "region": "Северная область", "detail": "Требование", "severity": 90}
    await open_war(room4, a4, b4, "territorial", "territory")
    w4 = next(iter(room4.wars.values()))
    assert w4["goal"] == "territory" and w4["claim_region"] == "Северная область"
    assert room4.war_pub(w4)["claim_region"] == "Северная область"
    w4["p"] = 65.0
    await ns.on_dictate(room4, a4, {"mode": "region"})
    assert a4.war is None, "при цели «территория» область берётся уже с 60%"
    assert any(m.get("type") == "cede_request" for m in b4.ws.messages)

    # 7. Без цели «территория» область по-прежнему только с 70%
    room5, a5, b5 = make_room("TERR2")
    await open_war(room5, a5, b5, "border", "tribute")
    w5 = next(iter(room5.wars.values()))
    w5["p"] = 65.0
    await ns.on_dictate(room5, a5, {"mode": "region"})
    assert a5.war, "обычная война: область только с 70%"

    # 8. Только агрессор с целью regime может менять власть
    room6, a6, b6 = make_room("ONLYAGG")
    await open_war(room6, a6, b6, "ideology", "tribute")
    w6 = next(iter(room6.wars.values()))
    w6["p"] = 90.0
    await ns.on_dictate(room6, a6, {"mode": "regime"})
    assert a6.war and b6.ideology == "традиционализм", "без цели «смена власти» режим не меняется"
    print("OK: multiplayer war goals — regime change, territory capture, coups, validation")


if __name__ == "__main__":
    asyncio.run(run())
