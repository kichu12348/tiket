import type { formFields } from "@db/schema";
import { HttpError } from "./errors";

export interface VisibilityConditionRule {
  fieldId: string; // Selected via Radix UI Select dropdown (single form question)
  allowedValues: string[]; // Checked via Radix UI Checkbox list (one or multiple values can be checked)
}

export interface ConditionRule {
  sourceType: "field" | "ticketType";
  sourceId: string; // fieldId or "ticketTypeId"
  operator: "equals" | "not_equals" | "contains" | "in";
  value: string | string[];
}

export interface ConditionGroup {
  match: "all" | "any"; // AND vs OR
  rules: ConditionRule[];
}

export interface FieldConditionConfig {
  match: "all" | "any"; // AND vs OR
  rules: ConditionRule[];
  thenAction: "show" | "require" | "hide";
  elseAction: "hide" | "optional" | "show";
}

export interface FormResponse {
  fieldId: string;
  responseValue: string;
}
type Field = Omit<typeof formFields.$inferSelect, "conditions"> & {
  conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
};

export function evaluateVisibilityConditions(
  conditions: VisibilityConditionRule[] | null | undefined,
  answers: Map<string, string>,
): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }
  return conditions.every((rule) => {
    if (!rule.fieldId || !rule.allowedValues || rule.allowedValues.length === 0) {
      return true;
    }
    const rawAnswer = answers.get(rule.fieldId) ?? "";
    if (!rawAnswer) return false;

    let userAnswers: string[] = [];
    if (rawAnswer.startsWith("[") && rawAnswer.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(rawAnswer);
        if (Array.isArray(parsed)) {
          userAnswers = parsed.map(String);
        } else {
          userAnswers = [rawAnswer];
        }
      } catch {
        userAnswers = [rawAnswer];
      }
    } else {
      userAnswers = [rawAnswer];
    }

    const compareEq = (a: string, b: string) =>
      a.trim().toLowerCase() === b.trim().toLowerCase();

    return userAnswers.some((ua) =>
      rule.allowedValues.some((av) => compareEq(ua, av)),
    );
  });
}

export function evaluateConditionRule(
  rule: ConditionRule,
  answers: Map<string, string>,
  ticketTypeId?: string,
): boolean {
  let sourceRaw = "";
  if (rule.sourceType === "ticketType") {
    sourceRaw = ticketTypeId ?? "";
  } else {
    sourceRaw = answers.get(rule.sourceId) ?? "";
  }

  let sourceArray: string[] | null = null;
  if (sourceRaw.startsWith("[") && sourceRaw.endsWith("]")) {
    try {
      const parsed: unknown = JSON.parse(sourceRaw);
      if (Array.isArray(parsed) && parsed.every((i) => typeof i === "string")) {
        sourceArray = parsed;
      }
    } catch {
      // not JSON
    }
  }

  const targetValues: string[] = Array.isArray(rule.value)
    ? rule.value.map(String)
    : [String(rule.value ?? "")];

  const compareEq = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();

  switch (rule.operator) {
    case "equals": {
      if (sourceArray !== null) {
        if (Array.isArray(rule.value)) {
          return (
            sourceArray.length === rule.value.length &&
            sourceArray.every((item, idx) =>
              compareEq(item, (rule.value as string[])[idx] ?? ""),
            )
          );
        }
        return targetValues.some((tv) =>
          sourceArray!.some((item) => compareEq(item, tv)),
        );
      }
      return targetValues.some((tv) => compareEq(sourceRaw, tv));
    }
    case "not_equals": {
      if (sourceArray !== null) {
        if (Array.isArray(rule.value)) {
          return !(
            sourceArray.length === rule.value.length &&
            sourceArray.every((item, idx) =>
              compareEq(item, (rule.value as string[])[idx] ?? ""),
            )
          );
        }
        return !targetValues.some((tv) =>
          sourceArray!.some((item) => compareEq(item, tv)),
        );
      }
      return !targetValues.some((tv) => compareEq(sourceRaw, tv));
    }
    case "contains": {
      const targetStr = (
        Array.isArray(rule.value)
          ? rule.value.join(" ")
          : String(rule.value ?? "")
      ).toLowerCase();
      if (sourceArray !== null) {
        return sourceArray.some(
          (item) =>
            item.toLowerCase().includes(targetStr) ||
            targetStr.includes(item.toLowerCase()),
        );
      }
      return sourceRaw.toLowerCase().includes(targetStr);
    }
    case "in": {
      if (sourceArray !== null) {
        return sourceArray.some((item) =>
          targetValues.some((tv) => compareEq(item, tv)),
        );
      }
      return targetValues.some((tv) => compareEq(sourceRaw, tv));
    }
    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  answers: Map<string, string>,
  ticketTypeId?: string,
): boolean {
  if (!group || !group.rules || group.rules.length === 0) {
    return true;
  }
  if (group.match === "any") {
    return group.rules.some((rule) =>
      evaluateConditionRule(rule, answers, ticketTypeId),
    );
  }
  return group.rules.every((rule) =>
    evaluateConditionRule(rule, answers, ticketTypeId),
  );
}

export function getFieldAction(
  field: Field,
  answers: Map<string, string>,
  ticketTypeId?: string,
): "show" | "require" | "hide" | "optional" {
  const fieldAny = field as unknown as {
    conditions?: VisibilityConditionRule[] | FieldConditionConfig | null;
  };
  const rawConditions =
    fieldAny.conditions ||
    (field.options &&
    typeof field.options === "object" &&
    !Array.isArray(field.options) &&
    "conditions" in field.options
      ? (field.options as {
          conditions?: VisibilityConditionRule[] | FieldConditionConfig;
        }).conditions
      : null);

  if (!rawConditions) {
    return field.isRequired ? "require" : "optional";
  }

  // Pure VisibilityConditionRule[] array
  if (Array.isArray(rawConditions)) {
    if (rawConditions.length === 0) {
      return field.isRequired ? "require" : "optional";
    }
    const isVisible = evaluateVisibilityConditions(rawConditions, answers);
    if (!isVisible) return "hide";
    return field.isRequired ? "require" : "show";
  }

  // Backward-compatibility with legacy FieldConditionConfig object
  if ("rules" in rawConditions && Array.isArray(rawConditions.rules)) {
    if (rawConditions.rules.length === 0) {
      return field.isRequired ? "require" : "optional";
    }
    const isMatch = evaluateConditionGroup(
      rawConditions,
      answers,
      ticketTypeId,
    );
    return isMatch ? rawConditions.thenAction : rawConditions.elseAction;
  }

  return field.isRequired ? "require" : "optional";
}

export function validateFormResponses(
  fields: Field[],
  responses: FormResponse[] = [],
  ticketTypeId?: string,
): void {
  const known = new Map(fields.map((field) => [field.id, field]));
  const answers = new Map<string, string>();
  for (const response of responses) {
    if (!known.has(response.fieldId))
      throw new HttpError(400, "A form field does not belong to this event.");
    if (answers.has(response.fieldId))
      throw new HttpError(400, "Duplicate form answers are not allowed.");
    answers.set(response.fieldId, response.responseValue.trim());
  }

  for (const field of fields) {
    const action = getFieldAction(field, answers, ticketTypeId);

    if (action === "hide") {
      // Hidden fields are stripped and ignored; no validation required
      answers.delete(field.id);
      continue;
    }

    const value = answers.get(field.id) ?? "";
    let selected: string[] = [];
    const multiple =
      field.fieldType === "multi_select" || field.fieldType === "checkbox";
    if (multiple && value) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((item) => typeof item === "string")
        )
          throw new Error("Invalid selection");
        selected = parsed;
      } catch {
        // Older clients encode selections as comma-separated values.
        selected = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    const isDynamicallyRequired =
      action === "require" || (action === "show" && field.isRequired);

    if (isDynamicallyRequired && (!value || (multiple && selected.length === 0))) {
      throw new HttpError(400, `${field.label} is required.`);
    }

    if (!value || (multiple && selected.length === 0)) continue;
    const invalid = () => {
      throw new HttpError(400, `Invalid answer for ${field.label}.`);
    };
    if (
      field.fieldType === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
      invalid();
    if (field.fieldType === "phone" && !/^\+?[\d\s\-()]{7,20}$/.test(value))
      invalid();
    if (
      field.fieldType === "number" &&
      (!value.trim() || !Number.isFinite(Number(value)))
    )
      invalid();
    if (
      field.fieldType === "rating" &&
      (!Number.isInteger(Number(value)) ||
        Number(value) < 1 ||
        Number(value) > 5)
    )
      invalid();
    if (field.fieldType === "url") {
      try {
        if (!["http:", "https:"].includes(new URL(value).protocol)) invalid();
      } catch {
        invalid();
      }
    }
    if (field.fieldType === "file" && !/^file:[0-9a-f-]{36}$/i.test(value))
      invalid();
    if (
      ["date", "datetime"].includes(field.fieldType) &&
      Number.isNaN(Date.parse(value))
    )
      invalid();
    if (
      field.fieldType === "time" &&
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
    )
      invalid();
    const options = field.options;
    const choices: string[] = Array.isArray(options)
      ? options.filter((item): item is string => typeof item === "string")
      : options &&
          typeof options === "object" &&
          "choices" in options &&
          Array.isArray(options.choices)
        ? options.choices.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
    if (multiple) {
      if (
        new Set(selected).size !== selected.length ||
        selected.some((item) => !choices.includes(item))
      )
        invalid();
      if (options && !Array.isArray(options) && typeof options === "object") {
        if (
          "min" in options &&
          typeof options.min === "number" &&
          selected.length < options.min
        )
          invalid();
        if (
          "max" in options &&
          typeof options.max === "number" &&
          selected.length > options.max
        )
          invalid();
      }
    } else if (
      ["select", "single_select", "radio"].includes(field.fieldType) &&
      !choices.includes(value)
    )
      invalid();
  }
}
