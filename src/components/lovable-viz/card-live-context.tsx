"use client";

import { createContext, useContext } from "react";
import type { CardBinding } from "@/lib/plant-tower";

/** When set, Lovable seed numbers defer to the left live read (no CH branding). */
export const CardLiveContext = createContext<CardBinding | null>(null);

export function useCardLive() {
  return useContext(CardLiveContext);
}
