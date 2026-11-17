"""Проверка сохранения и восстановления мультиплеерной кампании."""
import json
import tempfile
import unittest
from pathlib import Path

import nations_server as ns


class RoomPersistenceTest(unittest.TestCase):
    def test_running_room_restores_paused_with_tokens_and_full_state(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "rooms.json"
            old_rooms = ns.NROOMS.copy()
            try:
                ns.NROOMS.clear()
                room = ns.Room("TEST7")
                room.state = "running"
                room.month = 37
                room.length = 240
                room.territories = {"Ukraine|Odesa": "player-1"}
                room.wars = {"war-1": {"a": "player-1", "d": "player-2", "month": 30}}
                p = ns.Player(None, "player-1", "Игрок 1", "Украина")
                p.connected = True
                p.rep["gdp"] = 123456
                p.rep["infra"] = 43.5
                p.rep["infra_critical"] = 21.0
                p.rep["infra_count"] = 48
                p.rep["cities"] = 9
                p.relations["player-2"] = 45
                p.ars["strategic"] = 2 if "strategic" in p.ars else 0
                room.players[p.id] = p
                ns.NROOMS[room.code] = room

                self.assertTrue(ns.persist_rooms(path))
                data = json.loads(path.read_text(encoding="utf-8"))
                self.assertIn("TEST7", data)
                ns.NROOMS.clear()
                self.assertEqual(ns.restore_rooms(path), 1)

                restored = ns.NROOMS["TEST7"]
                self.assertEqual(restored.month, 37)
                self.assertEqual(restored.length, 240)
                self.assertEqual(restored.state, "paused")
                self.assertTrue(restored.auto_paused)
                self.assertEqual(restored.territories["Ukraine|Odesa"], "player-1")
                self.assertEqual(restored.players["player-1"].rep["gdp"], 123456)
                self.assertEqual(restored.players["player-1"].rep["infra"], 43.5)
                self.assertEqual(restored.players["player-1"].rep["infra_critical"], 21.0)
                self.assertEqual(restored.players["player-1"].rep["infra_count"], 48)
                self.assertEqual(restored.players["player-1"].rep["cities"], 9)
                self.assertEqual(restored.players["player-1"].relations["player-2"], 45)
                self.assertFalse(restored.players["player-1"].connected)
                self.assertIsNone(restored.players["player-1"].ws)
            finally:
                ns.NROOMS.clear()
                ns.NROOMS.update(old_rooms)

    def test_missing_file_is_safe(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(ns.restore_rooms(Path(td) / "missing.json"), 0)


if __name__ == "__main__":
    unittest.main()
