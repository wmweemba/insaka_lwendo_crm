import type { STAGE_VALUES } from "@/app/(dashboard)/contacts/validations";

// ui_spec.md §7.2 — the "temperature" palette: how close a lead is to the fire.
export const STAGE_COLORS: Record<(typeof STAGE_VALUES)[number], string> = {
  LEAD: "#6E6259",
  CONTACTED: "#B08D57",
  IN_CONVERSATION: "#D4A24C",
  TRIALING: "#E8934A",
  SIGNED_UP: "#E8622C",
  ACTIVE: "#F2551C",
  PAYING: "#FFA542",
  DORMANT: "#5B6B73",
  LOST: "#7A3B32",
};

// §5.3 — stage reaching SIGNED_UP or beyond gets the "fire catching" pulse.
export const PULSE_STAGES = new Set<(typeof STAGE_VALUES)[number]>([
  "SIGNED_UP",
  "ACTIVE",
  "PAYING",
]);
