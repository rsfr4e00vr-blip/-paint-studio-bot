"""Server-side validation tests for the multiplayer Grand Diplomacy rules."""
import asyncio
import nations_server as ns


class FakeSocket:
    def __init__(self):
        self.messages = []

    async def send_json(self, payload):
        self.messages.append(payload)


async def run_checks():
    room = ns.Room("DIPLO")
    room.state = "running"
    room.month = 30
    a = ns.Player(FakeSocket(), "a", "Игрок А", "Альфа", "либеральный курс")
    b = ns.Player(FakeSocket(), "b", "Игрок Б", "Бета", "традиционализм")
    room.players = {a.id: a, b.id: b}
    a.rep["pp"] = 60
    a.relations[b.id] = b.relations[a.id] = -40

    # A war without an explicit, validated cause is rejected.
    await ns.on_war(room, a, {"to": b.id})
    assert not a.war and not room.wars

    # Territorial claims mature for two months before they can justify war.
    await ns.on_claim(room, a, {"to": b.id, "region": "Восточная область"})
    assert b.id in a.claims
    assert a.claims[b.id]["region"] == "Восточная область"
    assert "territorial" not in room.diplomacy_grounds(a, b)
    room.month += 2
    assert "territorial" in room.diplomacy_grounds(a, b)

    # Ordinary disputes require an ultimatum and a two-month response window.
    await ns.on_war(room, a, {"to": b.id, "cause": "territorial"})
    assert not a.war and not room.wars
    await ns.on_ultimatum(room, a, {"to": b.id, "cause": "territorial"})
    assert a.ultimatums[b.id]["deadline"] == room.month + 2
    room.month += 2
    # Server, not the client, validates the selected casus belli and records it.
    await ns.on_war(room, a, {"to": b.id, "cause": "territorial"})
    assert a.war and b.war
    war = next(iter(room.wars.values()))
    assert war["cause"] == "territorial"
    assert any(m.get("type") == "war_start" and m.get("cause") == "territorial" for m in a.ws.messages)

    # Ideological grounds are only generated after a sustained diplomatic crisis.
    c = ns.Player(FakeSocket(), "c", "Игрок В", "Гамма", "государственный курс")
    d = ns.Player(FakeSocket(), "d", "Игрок Г", "Дельта", "традиционализм")
    room2 = ns.Room("IDEO")
    room2.month = 10
    room2.players = {c.id: c, d.id: d}
    c.relations[d.id] = d.relations[c.id] = -35
    room2.process_ideology_crises()
    assert d.id in c.ideology_cases
    room2.month += 2
    assert "ideology" in room2.diplomacy_grounds(c, d)

    # Consular/security crisis is a new server-validated casus belli.
    e = ns.Player(FakeSocket(), "e", "Игрок Е", "Эпсилон", "либеральный курс")
    f = ns.Player(FakeSocket(), "f", "Игрок Ж", "Дзета", "традиционализм")
    room3 = ns.Room("CONSULAR")
    room3.month = 40
    room3.players = {e.id: e, f.id: f}
    e.rep["pp"] = 30
    e.relations[f.id] = f.relations[e.id] = -40
    await ns.on_security_case(room3, e, {"to": f.id})
    assert f.id in e.security_cases
    assert "security" not in room3.diplomacy_grounds(e, f)
    room3.month += 2
    assert "security" in room3.diplomacy_grounds(e, f)
    await ns.on_ultimatum(room3, e, {"to": f.id, "cause": "security"})
    assert e.ultimatums[f.id]["cause"] == "security"

    g = ns.Player(FakeSocket(), "g", "Игрок З", "Альфа", "либеральный курс")
    h = ns.Player(FakeSocket(), "h", "Игрок И", "Нигерия", "традиционализм")
    room4 = ns.Room("REGION")
    room4.month = 10
    room4.players = {g.id: g, h.id: h}
    g.rep["pp"] = 30
    await ns.on_claim(room4, g, {"to": h.id, "region": "Несуществующая область"})
    assert h.id not in g.claims
    await ns.on_claim(room4, g, {"to": h.id, "region": "Лагос"})
    assert g.claims[h.id]["region"] == "Лагос"
    print("OK: multiplayer validation, region-specific claims, catalog ownership, ultimatum, ideology and consular-security crisis")


if __name__ == "__main__":
    asyncio.run(run_checks())
