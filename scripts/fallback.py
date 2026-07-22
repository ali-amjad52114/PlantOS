"""Write offline fallback snapshot from ClickHouse (no nested aggregates)."""
import json, urllib.request, ssl, base64
from pathlib import Path

HOST = "https://l8cacnn03w.us-east1.gcp.clickhouse.cloud:8443"
AUTH = base64.b64encode(b"default:DymJE_YA.c8gE").decode()

sql = b"""
SELECT
  tag,
  argMax(value, ts) AS value,
  argMax(ts, ts) AS ts,
  anyLast(area) AS area
FROM plantos.plant_readings
GROUP BY tag
FORMAT JSON
"""

req = urllib.request.Request(HOST, data=sql, method="POST")
req.add_header("Authorization", "Basic " + AUTH)
ctx = ssl.create_default_context()
with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
    data = json.loads(r.read().decode())

out_dirs = [
    Path(r"c:\AI\Projects\Clickhouse\data\fallback"),
    Path(r"c:\AI\Projects\Clickhouse\plantos\data\fallback"),
]
payload = json.dumps({"rows": data.get("data", []), "generated": True}, indent=2)
for d in out_dirs:
    d.mkdir(parents=True, exist_ok=True)
    (d / "latest_window.json").write_text(payload, encoding="utf-8")
print("fallback rows", len(data.get("data", [])))
