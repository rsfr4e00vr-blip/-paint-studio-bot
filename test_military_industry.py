"""Server tests for multiplayer factory mirroring, weapon stock and shared attack-map events."""
import asyncio
import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


async def run():
    room = ns.Room("FACTORY1")
    room.state = "running"
    room.month = 18
    a = ns.Player(FakeSocket(), "a", "Игрок А", "Альфа")
    b = ns.Player(FakeSocket(), "b", "Игрок Б", "Бета")
    room.players = {a.id: a, b.id: b}
    a.rep["money"] = 6000
    a.rep["steel"] = 55
    a.rep["fuel"] = 65
    a.rep["energy"] = 72
    b.rep["money"] = 5000
    b.rep["steel"] = 50
    b.rep["fuel"] = 60
    b.rep["energy"] = 70
    a.regions = [{"id": "AL:0", "name": "Север"}]
    b.regions = [{"id": "BE:0", "name": "Восточная область"}]

    # Сервер отклоняет строительство, если не хватает топлива или энергии.
    b.rep["fuel"] = 1
    before_b_money = b.rep["money"]
    await ns.on_factory_build(room, b, {"factory": "mlrs", "region": "BE:0"})
    assert not b.factory_builds and b.rep["money"] == before_b_money
    b.rep["fuel"] = 60

    # Строительство проверяется сервером, деньги и сталь списываются один раз.
    before_money, before_steel, before_fuel, before_energy = a.rep["money"], a.rep["steel"], a.rep["fuel"], a.rep["energy"]
    await ns.on_factory_build(room, a, {"factory": "mlrs", "region": "AL:0"})
    assert len(a.factory_builds) == 1
    build = a.factory_builds[0]
    assert build["type"] == "mlrs" and build["region_id"] == "AL:0"
    assert a.rep["money"] == before_money - ns.FACTORY_TYPES["mlrs"]["cost"]
    assert a.rep["steel"] == before_steel - 6
    assert a.rep["fuel"] == before_fuel - 5
    assert a.rep["energy"] == before_energy - 6
    state = next(m for m in a.ws.messages if m.get("type") == "factory_state")
    assert state["fuel"] == a.rep["fuel"] and state["energy"] == a.rep["energy"]

    # Клиентский ежемесячный симулятор передаёт построенный завод и произведённый склад на сервер.
    await ns.on_report(room, a, {"rep": {"gdp": 42000, "money": 4000, "steel": 44, "fuel": 52, "energy": 61,
        "ars": {"drone": 7, "rocket": 2, "mlrs": 3}},
        "regions": [{"id": "AL:0", "name": "Север"}],
        "factories": [{"id": "f1", "type": "mlrs", "region_id": "AL:0", "hp": 100, "progress": 2}],
        "factory_builds": []})
    assert a.ars["drone"] == 7 and a.ars["rocket"] == 2 and a.ars["mlrs"] == 3
    assert a.rep["fuel"] == 52 and a.rep["energy"] == 61
    assert ns.Room.factory_state(room, a)["fuel"] == 52 and ns.Room.factory_state(room, a)["energy"] == 61
    assert a.factories[0]["region_id"] == "AL:0" and a.factories[0]["progress"] == 2

    # Активная война: сервер списывает боеприпас, повреждает завод в выбранной области
    # и отправляет одинаковое событие атаки обоим игрокам.
    room.wars["w1"] = {"id": "w1", "a": a.id, "d": b.id, "p": 50.0, "m": 2, "attacks": []}
    a.war = b.war = "w1"
    a.ars["rocket"] = 2
    b.factories = [{"id": "bf1", "type": "mlrs", "region": "Восточная область", "region_id": "BE:0", "hp": 50, "progress": 0}]
    old_random = ns.random.random
    ns.random.random = lambda: 0.0
    try:
        await ns.on_ars_strike(room, a, {"weapon": "rocket", "target": "ind", "count": 1, "region": "BE:0"})
    finally:
        ns.random.random = old_random
    assert a.ars["rocket"] == 1
    w = room.wars["w1"]
    assert w["attacks"][0]["region_id"] == "BE:0"
    assert w["attacks"][0]["region_name"] == "Восточная область"
    assert w["attacks"][0]["factory_damage"]["destroyed"] is True
    attack_a = next(m for m in a.ws.messages if m.get("type") == "war_attack")
    attack_b = next(m for m in b.ws.messages if m.get("type") == "war_attack")
    assert attack_a["region_id"] == attack_b["region_id"] == "BE:0"
    assert attack_a["from_id"] == attack_b["from_id"] == a.id
    assert attack_a["to_id"] == attack_b["to_id"] == b.id
    assert not b.factories
    assert room.war_pub(w)["attacks"][0]["region_name"] == "Восточная область"
    assert any(m.get("type") == "factory_state" for m in b.ws.messages)
    print("OK: multiplayer factory build charges money/steel/fuel/energy, resource reports sync, regional factory destruction and shared attack-map event")


if __name__ == "__main__":
    asyncio.run(run())
