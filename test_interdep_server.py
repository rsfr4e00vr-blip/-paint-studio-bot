"""Тест серверного арсенала и сети отраслей в мультиплеере."""
import asyncio
import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


async def run():
    room = ns.Room("TESTA")
    room.state = "running"
    room.month = 30
    wa, wb = FakeSocket(), FakeSocket()
    a = ns.Player(wa, "a", "А", "Альфа")
    b = ns.Player(wb, "b", "Б", "Бета")
    room.players = {a.id: a, b.id: b}
    a.rep["money"] = 10_000
    room.wars["w1"] = {"id": "w1", "a": a.id, "d": b.id, "p": 50.0, "m": 0, "orders": {}}
    a.war = b.war = "w1"

    await ns.on_ars_buy(room, a, {"weapon": "cruise", "n": 6})
    assert a.ars["cruise"] == 6 and a.rep["money"] == 10_000 - 6 * 800
    assert any(m.get("type") == "ars_paid" for m in wa.messages)

    await ns.on_ars_strike(room, a, {"weapon": "cruise", "target": "energy", "count": 6})
    assert a.ars["cruise"] == 0
    assert ns.eco_gdp_factor(b.sect) < 0.7, ns.eco_gdp_factor(b.sect)
    assert any(m.get("type") == "eco_strike" for m in wb.messages)
    assert room.wars["w1"]["econ"][b.id]["gdp"] < 100

    # перезарядка и пустой склад
    await ns.on_ars_strike(room, a, {"weapon": "cruise", "target": "energy", "count": 1})
    assert a.ars_cd == room.month

    # ПВО защитника снижает ущерб
    c = ns.eco_new()
    d = ns.eco_new()
    ns.eco_strike(c, "ind", 3, 1, 0)
    ns.eco_strike(d, "ind", 3, 1, 0.35)
    assert d["industry"] > c["industry"]

    # ремонт идёт медленно
    g0 = ns.eco_gdp_factor(b.sect)
    for _ in range(6):
        ns.eco_recover(b.sect, True)
    assert g0 < ns.eco_gdp_factor(b.sect) < 0.98

    await room.tick()
    assert any(m.get("type") == "idp_sync" for m in wb.messages)
    print("OK: серверный арсенал и сеть отраслей")


asyncio.run(run())
