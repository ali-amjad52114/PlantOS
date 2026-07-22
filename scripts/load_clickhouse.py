import csv, json, os, time, urllib.request, ssl, gzip
from pathlib import Path

HOST = "https://l8cacnn03w.us-east1.gcp.clickhouse.cloud:8443"
USER = "default"
PASSWORD = "DymJE_YA.c8gE"
AUTH = (USER + ":" + PASSWORD).encode()
import base64
AUTH_HDR = "Basic " + base64.b64encode(AUTH).decode()

def q(sql, data=None):
    req = urllib.request.Request(HOST + "/?wait_end_of_query=1", data=(data if data is not None else sql.encode("utf-8")), method="POST")
    req.add_header("Authorization", AUTH_HDR)
    if data is None:
        req.add_header("Content-Type", "text/plain; charset=utf-8")
    else:
        req.add_header("Content-Type", "application/octet-stream")
        req.data = data
        # For insert with query param
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=600) as resp:
        return resp.read().decode("utf-8", errors="replace")

def q_param(sql, body: bytes):
    import urllib.parse
    url = HOST + "/?wait_end_of_query=1&query=" + urllib.parse.quote(sql)
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", AUTH_HDR)
    req.add_header("Content-Type", "text/plain; charset=utf-8")
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=600) as resp:
        return resp.read().decode("utf-8", errors="replace")

print("ping", q("SELECT 1"))

ddl = """
CREATE DATABASE IF NOT EXISTS plantos;
CREATE TABLE IF NOT EXISTS plantos.plant_readings (
  ts DateTime,
  tag String,
  value Float64,
  area LowCardinality(String),
  source LowCardinality(String) DEFAULT 'history',
  original_ts DateTime,
  loop_id UInt32 DEFAULT 0
) ENGINE = MergeTree
ORDER BY (tag, ts)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS plantos.plant_tags (
  tag String,
  label String,
  area String,
  unit String,
  normal_min Float64,
  normal_max Float64,
  description String,
  kind String
) ENGINE = MergeTree ORDER BY tag;

TRUNCATE TABLE IF EXISTS plantos.plant_readings;
TRUNCATE TABLE IF EXISTS plantos.plant_tags;
"""
for stmt in ddl.strip().split(";"):
    s = stmt.strip()
    if s:
        print("ddl", s[:60], "...", q(s))

root = Path(r"c:\AI\Projects\Clickhouse")
tags = json.loads((root/"data/plant/tag_map.json").read_text(encoding="utf-8"))
tag_rows = []
for t in tags:
    tag_rows.append(f"{t['id']}\t{t['label']}\t{t['area']}\t{t['unit']}\t{t['normalMin']}\t{t['normalMax']}\t{t['description']}\t{t['kind']}")
body = ("\n".join(tag_rows) + "\n").encode()
print("tags insert", q_param("INSERT INTO plantos.plant_tags FORMAT TSV", body))

wanted = {t["id"]: t["area"] for t in tags}
csv_path = root/"data/hai/raw/train1.csv"
# Stream insert selected tags — sample every 5th second to keep load reasonable overnight (~62k * 24 tags)
print("loading readings...")
buf = []
n = 0
inserted = 0
t0 = time.time()
with open(csv_path, newline="", encoding="utf-8", errors="replace") as f:
    # header is one semicolon line
    header = f.readline().strip().split(";")
    idx = {name: i for i, name in enumerate(header)}
    for line_i, line in enumerate(f):
        if line_i % 5 != 0:
            continue
        parts = line.rstrip("\n").split(";")
        ts = parts[0]
        # ClickHouse DateTime parse: '2019-09-11 20:00:00'
        for tag, area in wanted.items():
            try:
                val = float(parts[idx[tag]])
            except Exception:
                continue
            buf.append(f"{ts}\t{tag}\t{val}\t{area}\thistory\t{ts}\t0")
            n += 1
        if len(buf) >= 20000:
            body = ("\n".join(buf) + "\n").encode()
            q_param("INSERT INTO plantos.plant_readings FORMAT TSV", body)
            inserted += len(buf)
            buf.clear()
            print("inserted", inserted, "elapsed", round(time.time()-t0,1))
if buf:
    body = ("\n".join(buf) + "\n").encode()
    q_param("INSERT INTO plantos.plant_readings FORMAT TSV", body)
    inserted += len(buf)
print("done rows", inserted, "sec", round(time.time()-t0,1))
proof = q("SELECT count() AS c, min(ts), max(ts), uniqExact(tag) FROM plantos.plant_readings FORMAT JSON")
print(proof)
(root/"data/PROOF_CLICKHOUSE.md").write_text("# ClickHouse Proof\n\n```json\n"+proof+"\n```\n", encoding="utf-8")
