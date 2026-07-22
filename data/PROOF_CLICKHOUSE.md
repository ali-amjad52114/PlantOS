# ClickHouse Proof

```json
{
	"meta":
	[
		{
			"name": "c",
			"type": "UInt64"
		},
		{
			"name": "min(ts)",
			"type": "DateTime"
		},
		{
			"name": "max(ts)",
			"type": "DateTime"
		},
		{
			"name": "uniqExact(tag)",
			"type": "UInt64"
		}
	],

	"data":
	[
		{
			"c": 1486080,
			"min(ts)": "2019-09-11 20:00:00",
			"max(ts)": "2019-09-15 09:59:55",
			"uniqExact(tag)": 24
		}
	],

	"rows": 1,

	"statistics":
	{
		"elapsed": 0.023932045,
		"rows_read": 1486080,
		"bytes_read": 21981600
	}
}

```
