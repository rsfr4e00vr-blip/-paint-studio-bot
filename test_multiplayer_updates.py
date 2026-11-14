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

    # Arsenal purchases and economic strikes are server-validated and shared.
    a.rep["money"] = 5_000
    await ns.on_arsenal_buy(room, a, {"weapon": "missile", "qty": 2})
    assert a.arsenal["missile"] == 2 and a.rep["money"] == 4_480
    w = room.wars["w1"]
    w["econ"] = {a.id: {"gdp": 100.0, "fx": 100.0}, b.id: {"gdp": 100.0, "fx": 100.0}}
    before = b.rep["gdp"]
    await ns.on_arsenal_strike(room, a, {"weapon": "missile"})
    assert a.arsenal["missile"] == 1
    assert w["econ"][b.id]["gdp"] < 100.0 and b.rep["gdp"] < before
    assert any(x.get("type") == "arsenal_hit" for x in ws_a.messages + ws_b.messages)

    # Tick carries shared crisis, per-player responses and embassy state.
    await room.tick()
    tick = next(x for x in ws_a.messages if x.get("type") == "tick")
    assert "global_crisis" in tick and "crisis_responses" in tick and "embassies" in tick
    print("OK: multiplayer diplomacy, embassies, shared crisis response, war presets and arsenal strikes")


if __name__ == "__main__":
    asyncio.run(run_checks())
