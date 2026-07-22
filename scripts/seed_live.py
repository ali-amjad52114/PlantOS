import urllib.request, ssl, base64, json, urllib.parse
from datetime import datetime, timedelta

HOST = "https://l8cacnn03w.us-east1.gcp.clickhouse.cloud:8443"
AUTH = base64.b64encode(b"default:DymJE_YA.c8gE").decode()

def run(sql, body=None):
    if body is None:
        req = urllib.request.Request(HOST, data=sql.encode(), method="POST")
    else:
        url = HOST + "/?query=" + urllib.parse.quote(sql)
        req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", "Basic " + AUTH)
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=120) as r:
        return r.read().decode()

# get 30 recent history timestamps
j = run("SELECT DISTINCT ts FROM plantos.plant_readings WHERE source='history' ORDER BY ts DESC LIMIT 30 FORMAT JSON")
stamps = list(reversed([x["ts"] for x in json.loads(j)["data"]]))
now = datetime.utcnow()
rows = []
for i, ots in enumerate(stamps):
    live_ts = (now - timedelta(seconds=5*(len(stamps)-1-i))).strftime("%Y-%m-%d %H:%M:%S")
    jj = run(f"SELECT tag, value, area FROM plantos.plant_readings WHERE source='history' AND ts = toDateTime('{ots}') FORMAT JSON")
    for v in json.loads(jj)["data"]:
        rows.append(f"{live_ts}\t{v['tag']}\t{v['value']}\t{v['area']}\tlive\t{ots}\t0")
body = ("\n".join(rows)+"\n").encode()
print("inserting", len(rows))
print(run("INSERT INTO plantos.plant_readings FORMAT TSV", body) or "ok")
print(run("SELECT count() c, max(ts) FROM plantos.plant_readings WHERE source='live' FORMAT Pretty"))
