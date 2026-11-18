# Run: python3 test_multi_claim_server.py
import sys, types
try:
    import fastapi  # noqa
except Exception:
    m = types.ModuleType("fastapi"); m.WebSocket = object; m.WebSocketDisconnect = Exception; sys.modules["fastapi"] = m
import nations_server as ns
assert ns.claim_tokens("Крым · провинция 3|Одесская область|Одесская область") == ["Крым", "Одесская область"]
assert ns.claim_tokens("*") == ["*"] and ns.claim_tokens("") == []
assert ns.claim_string(["Крым", "*"]) == "*"
assert ns.claim_label("*") == "вся страна"
assert ns.claim_label("A|B|C|D|E") == "A, B и ещё 3"
assert len(ns.claim_string([f"Область номер {i}" for i in range(200)])) <= 900
print("OK: multiplayer multi-region claims helpers")
