import { z } from "zod";

export const plantRoleSchema = z.enum(["engineer", "operations", "finance"]);
export type PlantRole = z.infer<typeof plantRoleSchema>;

/** Typed transport metadata (Phase 4a) — role is not a message-text hack. */
export const plantClientDataSchema = z.object({
  role: plantRoleSchema,
  /** When true, expose advanceReplay. Default off — schedule/burst own the feed. */
  allowAdvanceReplay: z.boolean().optional(),
});
export type PlantClientData = z.infer<typeof plantClientDataSchema>;

/** Persisted Ask-agent visual tower (Lovable cards). */
export const plantTowerDataSchema = z.object({
  role: plantRoleSchema,
  deck: z.number(),
  deckName: z.string(),
  cards: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        hint: z.string(),
      })
    )
    .min(1)
    .max(4),
  source: z.enum(["role-default", "question-map", "selected"]),
  question: z.string().optional(),
  findingsKeys: z.array(z.string()).optional(),
});

/** Selected findings keys for the compact metric strip. */
export const visualSelectionDataSchema = z.object({
  cardTypes: z.array(z.string()),
  findingsKeys: z.array(z.string()),
  rationale: z.string(),
});

/** Transient investigation journey steps. */
export const investigationStepDataSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["running", "complete", "error"]),
  elapsedMs: z.number().optional(),
  role: plantRoleSchema.optional(),
});

/** Transient turn audit from lifecycle hooks (Phase 4a). */
export const turnAuditDataSchema = z.object({
  turn: z.number(),
  role: plantRoleSchema,
  toolNames: z.array(z.string()),
  towerDeck: z.number().optional(),
  elapsedMs: z.number().optional(),
  status: z.enum(["started", "complete"]),
});

export type PlantChatDataTypes = {
  "investigation-step": z.infer<typeof investigationStepDataSchema>;
  "plant-tower": z.infer<typeof plantTowerDataSchema>;
  "visual-selection": z.infer<typeof visualSelectionDataSchema>;
  "turn-audit": z.infer<typeof turnAuditDataSchema>;
};
