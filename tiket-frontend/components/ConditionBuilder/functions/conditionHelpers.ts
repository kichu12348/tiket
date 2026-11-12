import type {
  VisibilityConditionRule,
  VisibilityConditions,
} from "@/types/form";

export function extractChoices(options: unknown): string[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.filter((item): item is string => typeof item === "string");
  }
  if (typeof options === "string") {
    return options
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (
    typeof options === "object" &&
    "choices" in options &&
    Array.isArray((options as { choices?: unknown }).choices)
  ) {
    return (options as { choices: unknown[] }).choices.filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

export function parseConditions(
  conditions: VisibilityConditions | null | undefined,
): { match: "all" | "any"; rules: VisibilityConditionRule[] } {
  const match: "all" | "any" = !conditions
    ? "all"
    : Array.isArray(conditions)
      ? "all"
      : (conditions.match ?? "all");

  const rules: VisibilityConditionRule[] = !conditions
    ? []
    : Array.isArray(conditions)
      ? conditions
      : (conditions.rules ?? []);

  return { match, rules };
}
