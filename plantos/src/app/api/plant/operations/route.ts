import { NextResponse } from "next/server";
import { operationsSnapshot } from "@/lib/plant-services";
export async function GET() {
  try { return NextResponse.json(await operationsSnapshot()); }
  catch (e: any) { return NextResponse.json({ error: String(e?.message || e) }, { status: 500 }); }
}
