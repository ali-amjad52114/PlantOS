import { NextResponse } from "next/server";
import type { ShellMode } from "@/components/plant-shell";
import { bindCardType } from "@/lib/card-bindings";
import {
  engineerSnapshot,
  financeSnapshot,
  operationsSnapshot,
} from "@/lib/plant-services";
import type { PlantTowerPayload } from "@/lib/plant-tower";
import { cardMetaForType, getQuestionMap, type QuestionIndex } from "@/lib/question-card-maps";

const MODES: ShellMode[] = [
  "overview",
  "engineer",
  "finance",
  "maintenance",
  "safety",
  "operations",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") as ShellMode | null;
  const qRaw = url.searchParams.get("q");
  const q = Number(qRaw) as QuestionIndex;

  if (!mode || !MODES.includes(mode) || !(q === 0 || q === 1 || q === 2)) {
    return NextResponse.json(
      { error: "Query mode=(overview|engineer|finance|maintenance|safety|operations) and q=0|1|2 required" },
      { status: 400 }
    );
  }

  const t0 = Date.now();
  try {
    const map = getQuestionMap(mode, q);
    const [engineer, operations, finance] = await Promise.all([
      engineerSnapshot(),
      operationsSnapshot(),
      financeSnapshot(),
    ]);
    const snaps = { engineer, operations, finance };
    const dataSource =
      engineer.dataSource === "clickhouse" ||
      operations.dataSource === "clickhouse" ||
      (finance as any).dataSource === "clickhouse"
        ? "clickhouse"
        : String(engineer.dataSource ?? operations.dataSource ?? "unknown");

    const cards = map.cardTypes.map((type) => {
      const meta = cardMetaForType(type);
      return {
        type,
        label: meta.label,
        hint: meta.hint,
        binding: bindCardType(type, snaps),
      };
    });

    const tower: PlantTowerPayload = {
      role: map.role,
      deck: map.deck,
      deckName: map.deckName,
      cards,
      source: "question-map",
      mode,
      questionIndex: q,
      question: map.question,
      dataSource,
      elapsedMs: Date.now() - t0,
    };

    return NextResponse.json(tower);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
