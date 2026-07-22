import { NextResponse } from "next/server";
import { financeSnapshot } from "@/lib/plant-services";
export async function GET() {
  try { return NextResponse.json(await financeSnapshot()); }
  catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 500 }); }
}
