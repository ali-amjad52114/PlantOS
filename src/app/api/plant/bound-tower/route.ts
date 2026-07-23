import { NextResponse } from "next/server";
import type { ShellMode } from "@/components/plant-shell";
import { LOVABLE_CARD_META } from "@/components/lovable-viz/card-meta";
import { bindCardType } from "@/lib/card-bindings";
import {
  engineerSnapshot,
  financeSnapshot,
  operationsSnapshot,
} from "@/lib/plant-services";
import type { PlantRole, PlantTowerPayload } from "@/lib/plant-tower";
import { cardMetaForType, getQuestionMap, type QuestionIndex } from "@/lib/question-card-maps";
import { rankSelectVisuals } from "@/lib/visual-catalog";

const MODES: ShellMode[] = [
  "overview",
  "engineer",
  "finance",
  "maintenance",
  "safety",
  "operations",
];

function roleForMode(mode: ShellMode): PlantRole {
  if (mode === "finance") return "finance";
  if (mode === "operations") return "operations";
  return "engineer";
}

async function bindTypes(
  cardTypes: string[],
  opts: {
    role: PlantRole;
    mode?: string;
    question?: string;
    questionIndex?: number;
    source: PlantTowerPayload["source"];
    deck?: number;
    deckName?: string;
    findingsKeys?: string[];
  }
): Promise<PlantTowerPayload> {
  const t0 = Date.now();
  const [engineer, operations, finance] = await Promise.all([
    engineerSnapshot(),
    operationsSnapshot(),
    financeSnapshot(),
  ]);
  const snaps = { engineer, operations, finance };
  const dataSource =
    engineer.dataSource === "clickhouse" ||
    operations.dataSource === "clickhouse" ||
    (finance as { dataSource?: string }).dataSource === "clickhouse"
      ? "clickhouse"
      : String(engineer.dataSource ?? operations.dataSource ?? "unknown");

  const cards = cardTypes.map((type) => {
    const meta =
      LOVABLE_CARD_META.find((c) => c.type === type) ??
      (() => {
        try {
          return cardMetaForType(type);
        } catch {
          return { type, label: type, hint: "", deck: 0, deckName: "Selected" };
        }
      })();
    return {
      type,
      label: meta.label,
      hint: meta.hint,
      binding: bindCardType(type, snaps),
    };
  });

  const primary = LOVABLE_CARD_META.find((c) => c.type === cardTypes[0]);
  return {
    role: opts.role,
    deck: opts.deck ?? primary?.deck ?? 0,
    deckName: opts.deckName ?? primary?.deckName ?? "Selected",
    cards,
    source: opts.source,
    mode: opts.mode,
    questionIndex: opts.questionIndex,
    question: opts.question,
    dataSource,
    elapsedMs: Date.now() - t0,
    findingsKeys: opts.findingsKeys,
  };
}

/** Legacy: mode+q fixtures (eval / e2e). Prefer POST with cardTypes for runtime. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const typesParam = url.searchParams.get("types");
  const mode = url.searchParams.get("mode") as ShellMode | null;
  const question = url.searchParams.get("question") ?? undefined;
  const qRaw = url.searchParams.get("q");
  const q = Number(qRaw) as QuestionIndex;

  try {
    if (typesParam) {
      const cardTypes = typesParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (!cardTypes.length) {
        return NextResponse.json({ error: "types=CardA,CardB required" }, { status: 400 });
      }
      const role = (url.searchParams.get("role") as PlantRole) || roleForMode(mode ?? "engineer");
      const tower = await bindTypes(cardTypes, {
        role,
        mode: mode ?? undefined,
        question,
        source: "selected",
      });
      return NextResponse.json(tower);
    }

    if (!mode || !MODES.includes(mode) || !(q === 0 || q === 1 || q === 2)) {
      return NextResponse.json(
        {
          error:
            "Provide types=CardA,CardB or legacy mode=(…) and q=0|1|2",
        },
        { status: 400 }
      );
    }

    const map = getQuestionMap(mode, q);
    const tower = await bindTypes(map.cardTypes, {
      role: map.role,
      mode,
      questionIndex: q,
      question: map.question,
      source: "question-map",
      deck: map.deck,
      deckName: map.deckName,
    });
    return NextResponse.json(tower);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Bind explicit cardTypes from selectVisuals (runtime path). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      cardTypes?: string[];
      role?: PlantRole;
      mode?: string;
      question?: string;
      findingsKeys?: string[];
      deck?: number;
      deckName?: string;
    };
    let cardTypes = body.cardTypes?.filter(Boolean) ?? [];
    const role = body.role ?? roleForMode((body.mode as ShellMode) || "engineer");
    let findingsKeys = body.findingsKeys;
    let deck = body.deck;
    let deckName = body.deckName;

    if (!cardTypes.length && body.question) {
      const ranked = rankSelectVisuals({ question: body.question, role });
      cardTypes = ranked.cardTypes;
      findingsKeys = ranked.findingsKeys;
      deck = ranked.deck;
      deckName = ranked.deckName;
    }

    if (!cardTypes.length) {
      return NextResponse.json(
        { error: "cardTypes[] or question required" },
        { status: 400 }
      );
    }

    const tower = await bindTypes(cardTypes, {
      role,
      mode: body.mode,
      question: body.question,
      source: "selected",
      deck,
      deckName,
      findingsKeys,
    });
    return NextResponse.json(tower);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
