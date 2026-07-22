import json
from pathlib import Path
root = Path(r"c:\AI\Projects\Clickhouse")
tags = [
  {"id":"P1_PIT01","label":"Boiler pressure (PIT01)","area":"boiler","unit":"bar","normalMin":0.5,"normalMax":2.0,"description":"Boiler process pressure indicator","kind":"measurement"},
  {"id":"P1_PIT02","label":"Boiler pressure (PIT02)","area":"boiler","unit":"bar","normalMin":0.1,"normalMax":0.5,"description":"Secondary boiler pressure","kind":"measurement"},
  {"id":"P1_TIT01","label":"Boiler temperature (TIT01)","area":"boiler","unit":"C","normalMin":20,"normalMax":80,"description":"Boiler temperature","kind":"measurement"},
  {"id":"P1_TIT02","label":"Boiler temperature (TIT02)","area":"boiler","unit":"C","normalMin":20,"normalMax":80,"description":"Boiler temperature secondary","kind":"measurement"},
  {"id":"P1_FT01","label":"Boiler steam/flow (FT01)","area":"boiler","unit":"t/h","normalMin":50,"normalMax":400,"description":"Boiler flow transmitter","kind":"measurement"},
  {"id":"P1_LIT01","label":"Boiler drum level (LIT01)","area":"boiler","unit":"%","normalMin":300,"normalMax":500,"description":"Boiler level indicator","kind":"measurement"},
  {"id":"P1_PCV01Z","label":"Pressure control valve position","area":"boiler","unit":"%","normalMin":0,"normalMax":100,"description":"PCV01 actual position","kind":"state"},
  {"id":"P1_FCV03Z","label":"Flow control valve position","area":"boiler","unit":"%","normalMin":0,"normalMax":100,"description":"FCV03 actual position","kind":"state"},
  {"id":"P2_SIT01","label":"Turbine speed (SIT01)","area":"turbine","unit":"rpm","normalMin":700,"normalMax":900,"description":"Turbine/shaft speed indicator","kind":"measurement"},
  {"id":"P2_VT01e","label":"Turbine vibration","area":"turbine","unit":"mm/s","normalMin":0,"normalMax":20,"description":"Vibration transmitter","kind":"measurement"},
  {"id":"P2_VXT02","label":"Turbine vib X2","area":"turbine","unit":"mm/s","normalMin":-10,"normalMax":10,"description":"Vibration X axis","kind":"measurement"},
  {"id":"P2_VYT02","label":"Turbine vib Y2","area":"turbine","unit":"mm/s","normalMin":-5,"normalMax":5,"description":"Vibration Y axis","kind":"measurement"},
  {"id":"P2_On","label":"Turbine On state","area":"turbine","unit":"bool","normalMin":0,"normalMax":1,"description":"Turbine running flag","kind":"state"},
  {"id":"P2_Auto","label":"Turbine Auto mode","area":"turbine","unit":"bool","normalMin":0,"normalMax":1,"description":"Auto mode flag","kind":"state"},
  {"id":"P3_LT01","label":"Water treatment level","area":"water_treatment","unit":"%","normalMin":10,"normalMax":80,"description":"Water process level","kind":"measurement"},
  {"id":"P3_LCV01D","label":"Water level valve demand","area":"water_treatment","unit":"%","normalMin":0,"normalMax":30000,"description":"Level control valve demand","kind":"command"},
  {"id":"P3_LH","label":"Water high level limit","area":"water_treatment","unit":"%","normalMin":50,"normalMax":100,"description":"High level setpoint/limit","kind":"setpoint"},
  {"id":"P3_LL","label":"Water low level limit","area":"water_treatment","unit":"%","normalMin":0,"normalMax":30,"description":"Low level setpoint/limit","kind":"setpoint"},
  {"id":"P4_ST_PO","label":"Steam turbine power output","area":"generator","unit":"MW","normalMin":0,"normalMax":400,"description":"HIL steam-turbine power output — USED AS PRODUCTION SIGNAL","kind":"measurement","isProduction":True},
  {"id":"P4_ST_LD","label":"Steam turbine load","area":"generator","unit":"MW","normalMin":0,"normalMax":400,"description":"Steam turbine load","kind":"measurement"},
  {"id":"P4_ST_PT01","label":"Steam turbine pressure","area":"generator","unit":"bar","normalMin":0,"normalMax":100,"description":"Steam pressure at turbine","kind":"measurement"},
  {"id":"P4_ST_TT01","label":"Steam turbine temperature","area":"generator","unit":"C","normalMin":0,"normalMax":30000,"description":"Steam temperature (raw SCADA scale)","kind":"measurement"},
  {"id":"P4_ST_FD","label":"Steam turbine feed","area":"generator","unit":"t/h","normalMin":-1,"normalMax":1,"description":"Steam feed related","kind":"measurement"},
  {"id":"P4_HT_PO","label":"Hydro turbine power","area":"generator","unit":"MW","normalMin":0,"normalMax":100,"description":"Pumped-storage hydro power output","kind":"measurement"},
]
plant = root / "data" / "plant"
plant.mkdir(parents=True, exist_ok=True)
(plant / "tag_map.json").write_text(json.dumps(tags, indent=2), encoding="utf-8")
hierarchy = {
  "plant": "HAI hybrid power testbed",
  "flow": ["water_treatment", "boiler", "turbine", "generator"],
  "areas": {
    "water_treatment": {"supports": "boiler", "tags": [t["id"] for t in tags if t["area"]=="water_treatment"]},
    "boiler": {"produces": "steam", "tags": [t["id"] for t in tags if t["area"]=="boiler"]},
    "turbine": {"driven_by": "steam", "tags": [t["id"] for t in tags if t["area"]=="turbine"]},
    "generator": {"driven_by": "turbine", "tags": [t["id"] for t in tags if t["area"]=="generator"]},
  },
  "productionTag": "P4_ST_PO",
  "productionDecision": "Using P4_ST_PO as production. HAI HIL emulates steam-turbine power generation; no separate generator MW column in HAI 20.07 — auto-redefinition per product lock."
}
(plant / "hierarchy.json").write_text(json.dumps(hierarchy, indent=2), encoding="utf-8")
(root / "data" / "HAI_SOURCE.md").write_text("""# HAI Source

- Repo: https://github.com/icsdataset/hai
- Version: **HAI 20.07** normal train (`train1.csv.gz`)
- Fallback reason: HAI 22+/23 GitHub LFS budget exceeded
- sha256(train1.csv): f5ee576aabaa1f146e671a4228129e26ea921addd577a179c7e0299aefbc7c22
- Rows: 309600 @ 1Hz
- Time: 2019-09-11 20:00:00 to 2019-09-15 09:59:59
- Delimiter: semicolon
- Areas: P1 boiler, P2 turbine, P3 water treatment, P4 HIL steam/hydro
- Attribution: NSRI / icsdataset HAI testbed
""", encoding="utf-8")
print("ok", len(tags))
