import { z } from "zod";
import type { TicketType } from "@/types/ticketType";
import type {
  FormField,
  ConditionRule,
  ConditionGroup,
  FieldConditionConfig,
  VisibilityConditionRule,
  VisibilityConditions,
} from "@/types/form";

export function evaluateVisibilityConditions(
  conditions: VisibilityConditions | null | undefined,
  answers: Map<string, string>,
): boolean {
  if (!conditions) {
    return true;
  }

  const match: "all" | "any" = Array.isArray(conditions)
    ? "all"
    : conditions.match ?? "all";

  const rules: VisibilityConditionRule[] = Array.isArray(conditions)
    ? conditions
    : conditions.rules ?? [];

  if (rules.length === 0) {
    return true;
  }

  const evaluateRule = (rule: VisibilityConditionRule): boolean => {
    if (!rule.fieldId || !rule.allowedValues || rule.allowedValues.length === 0) {
      return true;
    }
    const rawAnswer = answers.get(rule.fieldId) ?? "";
    // Option A: Hidden until answered!
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

    const op = rule.operator ?? (rule.allowedValues.length > 1 ? "in" : "equals");

    switch (op) {
      case "not_equals":
        return !userAnswers.some((ua) =>
          rule.allowedValues.some((av) => compareEq(ua, av)),
        );
      case "equals":
      case "in":
      default:
        return userAnswers.some((ua) =>
          rule.allowedValues.some((av) => compareEq(ua, av)),
        );
    }
  };

  if (match === "any") {
    return rules.some(evaluateRule);
  }
  return rules.every(evaluateRule);
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
  field: FormField,
  answers: Map<string, string>,
  ticketTypeId?: string,
): "show" | "require" | "hide" | "optional" {
  const optionsObj =
    field.options &&
    typeof field.options === "object" &&
    !Array.isArray(field.options)
      ? (field.options as {
          conditions?: VisibilityConditionRule[] | FieldConditionConfig;
        })
      : null;

  const rawConditions = field.conditions || optionsObj?.conditions;

  if (!rawConditions) {
    return field.isRequired ? "require" : "optional";
  }

  // VisibilityConditions (array or { match, rules })
  if (
    Array.isArray(rawConditions) ||
    ("rules" in rawConditions &&
      Array.isArray(rawConditions.rules) &&
      !("thenAction" in rawConditions))
  ) {
    const isVisible = evaluateVisibilityConditions(
      rawConditions as VisibilityConditions,
      answers,
    );
    if (!isVisible) return "hide";
    return field.isRequired ? "require" : "show";
  }

  // Legacy FieldConditionConfig
  if ("rules" in rawConditions && "thenAction" in rawConditions) {
    const legacyConfig = rawConditions as FieldConditionConfig;
    if (legacyConfig.rules.length === 0) {
      return field.isRequired ? "require" : "optional";
    }
    const isMatch = evaluateConditionGroup(
      legacyConfig,
      answers,
      ticketTypeId,
    );
    return isMatch ? legacyConfig.thenAction : legacyConfig.elseAction;
  }

  return field.isRequired ? "require" : "optional";
}

/** Returns true when a ticket type is currently on sale. */
export function isTicketActive(tt: TicketType): boolean {
  if (tt.isClosed) return false;
  const now = new Date();
  if (tt.saleStart && new Date(tt.saleStart) > now) return false;
  if (tt.saleEnd && new Date(tt.saleEnd) < now) return false;
  return true;
}

/** Formats a price string as a localised currency or "Free". */
export function formatPrice(price: string): string {
  const n = parseFloat(price);
  if (n === 0) return "Free";
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Extracts string choices from a FormField's options whether it is
 * string[] or { choices: string[] }.
 */
export function extractChoices(options: FormField["options"]): string[] {
  if (Array.isArray(options)) {
    return options.filter((item): item is string => typeof item === "string");
  }
  if (
    options &&
    typeof options === "object" &&
    "choices" in options &&
    Array.isArray(options.choices)
  ) {
    return options.choices.filter(
      (item): item is string => typeof item === "string",
    );
  }
  return [];
}

/**
 * Groups and sorts form fields by page (1-indexed) and sortOrder.
 */
export function groupFieldsByPage(fields: FormField[]): {
  pages: Record<number, FormField[]>;
  maxPage: number;
  sortedFields: FormField[];
} {
  if (!fields || fields.length === 0) {
    return { pages: {}, maxPage: 0, sortedFields: [] };
  }

  const minPage = Math.min(...fields.map((f) => f.page));
  const pageOffset = minPage === 0 ? 1 : 0;

  const sortedFields = [...fields]
    .map((f) => ({
      ...f,
      page: f.page + pageOffset,
    }))
    .sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    });

  const maxPage = Math.max(...sortedFields.map((f) => f.page));
  const pages: Record<number, FormField[]> = {};

  for (const f of sortedFields) {
    if (!pages[f.page]) pages[f.page] = [];
    pages[f.page]!.push(f);
  }

  return { pages, maxPage, sortedFields };
}

/**
 * Derives a Zod schema from an array of FormField definitions and live conditional rules.
 * Validates each field type in 100% compliance with tiket-backend validateFormResponses.
 */
export function buildZodSchema(
  fields: FormField[],
  ticketTypeId?: string,
): z.ZodTypeAny {
  const shape: z.ZodRawShape = {};

  for (const field of fields) {
    const multiple = field.fieldType === "multi_select";
    shape[field.id] = multiple
      ? z.array(z.string()).default([])
      : z.string().default("");
  }

  return z.object(shape).superRefine((data, ctx) => {
    const answers = new Map<string, string>();
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        answers.set(
          key,
          Array.isArray(val) ? JSON.stringify(val) : String(val).trim(),
        );
      }
    }

    for (const field of fields) {
      const action = getFieldAction(field, answers, ticketTypeId);
      if (action === "hide") {
        // Hidden field: do not validate or issue any errors
        continue;
      }

      const val = data[field.id];
      const multiple = field.fieldType === "multi_select";
      const items: string[] = Array.isArray(val) ? (val as string[]) : [];
      const trimmed = typeof val === "string" ? val.trim() : "";

      const isReq =
        action === "require" || (action === "show" && field.isRequired);

      const opts =
        field.options &&
        typeof field.options === "object" &&
        !Array.isArray(field.options)
          ? field.options
          : null;
      const allowCustom = Boolean(opts?.allowCustom);

      if (multiple) {
        if (isReq && items.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: `${field.label} is required`,
          });
          continue;
        }
        if (items.length === 0) continue;

        if (new Set(items).size !== items.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: "Duplicate selections are not allowed",
          });
        }
        const choices = extractChoices(field.options);
        if (
          !allowCustom &&
          choices.length > 0 &&
          items.some((item) => !choices.includes(item))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: `Invalid answer for ${field.label}`,
          });
        }
        const minChoices = typeof opts?.min === "number" ? opts.min : null;
        const maxChoices = typeof opts?.max === "number" ? opts.max : null;
        if (minChoices !== null && items.length < minChoices) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: `Select at least ${minChoices} option${minChoices > 1 ? "s" : ""}`,
          });
        }
        if (maxChoices !== null && items.length > maxChoices) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: `Select at most ${maxChoices} option${maxChoices > 1 ? "s" : ""}`,
          });
        }
        continue;
      }

      if (isReq && !trimmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: `${field.label} is required`,
        });
        continue;
      }
      if (!trimmed) continue;

      if (
        field.fieldType === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: "Enter a valid email address",
        });
      }

      if (
        field.fieldType === "phone" &&
        !/^\+?[\d\s\-()]{7,20}$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: "Enter a valid phone number",
        });
      }

      if (
        field.fieldType === "number" &&
        (!trimmed || !Number.isFinite(Number(trimmed)))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: "Must be a valid number",
        });
      }

      if (field.fieldType === "rating") {
        const n = Number(trimmed);
        if (!Number.isInteger(n) || n < 1 || n > 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: "Rating must be an integer from 1 to 5",
          });
        }
      }

      if (field.fieldType === "url") {
        try {
          const u = new URL(trimmed);
          if (!["http:", "https:"].includes(u.protocol)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field.id],
              message: "URL must begin with http:// or https://",
            });
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.id],
            message: "Enter a valid URL",
          });
        }
      }

      if (
        ["date", "datetime"].includes(field.fieldType) &&
        Number.isNaN(Date.parse(trimmed))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: "Enter a valid date",
        });
      }

      if (
        field.fieldType === "time" &&
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: "Enter a valid time (HH:mm)",
        });
      }

      const choices = extractChoices(field.options);
      if (
        field.fieldType === "single_select" &&
        choices.length > 0 &&
        !allowCustom &&
        !choices.includes(trimmed)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.id],
          message: `Please select a valid option for ${field.label}`,
        });
      }
    }
  });
}

/**
 * Converts raw react-hook-form data into the flat form-response array
 * expected by the POST /api/orders body. Strips fields that evaluate to "hide".
 */
export function buildFormResponses(
  formFields: FormField[],
  data: Record<string, unknown>,
  ticketTypeId?: string,
): { fieldId: string; responseValue: string }[] {
  const answers = new Map<string, string>();
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      answers.set(
        key,
        Array.isArray(val) ? JSON.stringify(val) : String(val).trim(),
      );
    }
  }

  return formFields
    .filter((field) => getFieldAction(field, answers, ticketTypeId) !== "hide")
    .map((field) => {
      const val = data[field.id];
      if (val === undefined || val === null || val === "") return null;
      if (Array.isArray(val)) {
        if (val.length === 0) return null;
        return { fieldId: field.id, responseValue: JSON.stringify(val) };
      }
      const strVal = String(val).trim();
      if (!strVal) return null;
      return { fieldId: field.id, responseValue: strVal };
    })
    .filter(Boolean) as { fieldId: string; responseValue: string }[];
}
