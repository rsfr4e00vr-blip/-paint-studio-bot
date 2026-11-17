"""Smoke tests for the merged Novaria multiplayer features."""
import asyncio
import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


async def run_checks():
    room = ns.Room("TEST1")
    room.state = "running"
    room.month = 30
    ws_a, ws_b = FakeSocket(), FakeSocket()
    a = ns.Player(ws_a, "a", "Игрок А", "Альфа")
    b = ns.Player(ws_b, "b", "Игрок Б", "Бета")
    room.players = {a.id: a, b.id: b}
    a.rep["money"] = b.rep["money"] = 10_000

    # New diplomacy actions are server-validated and debited once.
    await ns.on_diplomacy(room, a, {"to": b.id, "action": "gift"})
    assert a.rep["money"] == 9_550
    assert a.relations[b.id] == 10 and b.relations[a.id] == 10
    assert any(x.get("type") == "mp_adjust" and x.get("money") == -450 for x in ws_a.messages)

    # Embassy is capped, costs upkeep and improves relations every four active months.
    await ns.on_diplomacy(room, a, {"to": b.id, "action": "embassy"})
    assert b.id in a.embassies
    balance = a.rep["money"]
    for _ in range(4):
        await room.process_embassies()
    assert a.rep["money"] == balance - 80
    assert a.embassies[b.id]["months_left"] == 20

    # The world crisis is shared by the room, while each country can respond once.
    room.global_crisis = {"id": "food", "left": 5, "age": 0}
    a.rep["money"] = 1_000
    await ns.on_global_response(room, a)
    assert a.crisis_response == "food" and a.rep["money"] == 600
    assert any(x.get("type") == "mp_adjust" and x.get("food") == 16 for x in ws_a.messages)

    # New war presets are validated and synchronized to both sides.
    room.wars["w1"] = {"id": "w1", "a": a.id, "d": b.id, "p": 50.0, "m": 0, "orders": {}}
    a.war = b.war = "w1"
    await ns.on_war_command(room, a, {
        "preset": "pressure", "troops": 12_345, "air": "strategic", "navy": "blockade",
        "spec": "recon", "logi": "convoys", "alloc": "focus",
    })
    order = room.wars["w1"]["orders"][a.id]
    assert order["preset"] == "pressure"
    assert order["air"] == "strategic" and order["troops"] == 12_345

    # Infrastructure is now synchronized to the server, bounded, persisted in standings,
    # and its damage reduces the multiplayer income modifier and welfare score.
    await ns.on_report(room, a, {"rep": {"gdp": 42000, "money": 9000, "debt": 0, "stab": 68, "appr": 61,
        "legit": 70, "trust": 70, "power": 100, "pop": 8200000, "infra": 40,
        "infra_critical": 25, "infra_count": 60, "cities": 12}})
    assert a.rep["infra"] == 40 and a.rep["infra_critical"] == 25
    assert a.rep["infra_count"] == 60 and a.rep["cities"] == 12
    damaged_mod = room.income_mod(a)
    assert damaged_mod["infrastructure"] == -0.075
    assert damaged_mod["total"] < room.income_mod(b)["total"]
    assert a.pub()["infra"] == 40 and a.pub()["infra_count"] == 60
    await ns.on_report(room, a, {"rep": {"infra": 999, "infra_critical": -20, "infra_count": 9999999, "cities": -4}})
    assert a.rep["infra"] == 100 and a.rep["infra_critical"] == 0
    assert a.rep["infra_count"] == 100000 and a.rep["cities"] == 0

    # Tick carries shared crisis, per-player responses and embassy state.
    await room.tick()
    tick = next(x for x in ws_a.messages if x.get("type") == "tick")
    assert "global_crisis" in tick and "crisis_responses" in tick and "embassies" in tick
    print("OK: multiplayer diplomacy, embassies, shared crisis response and war presets")


if __name__ == "__main__":
    asyncio.run(run_checks())
