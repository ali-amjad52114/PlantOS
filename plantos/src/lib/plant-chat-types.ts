import { z } from "zod";

/** Persisted Ask-agent visual tower (Lovable cards). */
export const plantTowerDataSchema = z.object({
  role: z.enum(["engineer", "operations", "finance"]),
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
    .length(4),
  source: z.literal("role-default"),
});

/** Transient investigation journey steps. */
export const investigationStepDataSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["running", "complete", "error"]),
  elapsedMs: z.number().optional(),
  role: z.enum(["engineer", "operations", "finance"]).optional(),
});

export type PlantChatDataTypes = {
  "investigation-step": z.infer<typeof investigationStepDataSchema>;
  "plant-tower": z.infer<typeof plantTowerDataSchema>;
};
