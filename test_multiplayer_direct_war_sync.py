"""Regression tests for one-click multiplayer war and live shared standings."""
import asyncio
import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


def make_room(month=0):
    room = ns.Room("DIRECT")
    room.state = "running"
    room.month = month
    a = ns.Player(FakeSocket(), "a", "Игрок А", "Альфа", "либеральный курс")
    b = ns.Player(FakeSocket(), "b", "Игрок Б", "Бета", "традиционализм")
    room.players = {a.id: a, b.id: b}
    a.rep["pp"] = 60
    a.shield_until = b.shield_until = 0
    return room, a, b


async def run():
    # Direct war is available from the start without the old 24-month lock or a 4-month crisis chain.
    room, a, b = make_room(0)
    await ns.on_war(room, a, {"to": b.id, "cause": "aggression", "goal": "tribute"})
    assert a.war and b.war and len(room.wars) == 1
    assert a.rep["pp"] == 30
    start_a = next(x for x in a.ws.messages if x.get("type") == "war_start")
    start_b = next(x for x in b.ws.messages if x.get("type") == "war_start")
    assert start_a["wars"] == start_b["wars"], "both players must receive the same authoritative war snapshot"
    assert start_a["wars"][0]["cause"] == "aggression"
    assert any(x.get("type") == "war_state" for x in a.ws.messages)
    assert any(x.get("type") == "pp_update" and x.get("pp") == 30 for x in a.ws.messages)

    # Direct war cannot be started if the target is offline or the attacker lacks political power.
    room2, a2, b2 = make_room(0)
    b2.connected = False
    await ns.on_war(room2, a2, {"to": b2.id, "cause": "aggression"})
    assert not room2.wars and not a2.war

    room3, a3, b3 = make_room(0)
    a3.rep["pp"] = 10
    await ns.on_war(room3, a3, {"to": b3.id, "cause": "aggression"})
    assert not room3.wars and not a3.war
    assert any("30 политической власти" in x.get("text", "") for x in a3.ws.messages if x.get("type") == "notice")

    # Reports publish a fresh common scoreboard immediately; duplicate same-month reports
    # cannot farm extra score-GDP growth.
    room4, a4, b4 = make_room(5)
    report = {"gdp": 42000, "money": 18000, "debt": 0, "infl": 5, "rate": 5,
              "stab": 68, "appr": 61, "legit": 70, "trust": 70, "power": ns.START_POWER,
              "pop": 8200000, "income": 800, "res": 70, "pp": 60, "infra": 100,
              "steel": 55, "fuel": 65, "energy": 72}
    await ns.on_report(room4, a4, {"rep": report})
    score_before = a4.score_gdp
    report2 = dict(report, gdp=100000)
    await ns.on_report(room4, a4, {"rep": report2})
    assert a4.score_gdp == score_before
    assert any(x.get("type") == "standings" for x in a4.ws.messages)
    assert any(x.get("type") == "standings" for x in b4.ws.messages)
    print("OK: direct multiplayer war, both-side snapshots, PP validation, live standings and no same-month score farming")


if __name__ == "__main__":
    asyncio.run(run())
