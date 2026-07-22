import { createClient } from "@clickhouse/client";

export function getClickHouse() {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) throw new Error("CLICKHOUSE_URL missing");
  return createClient({ url, database: "plantos", clickhouse_settings: { readonly: "0" } });
}

export type Reading = { ts: string; tag: string; value: number; area: string; source: string };
