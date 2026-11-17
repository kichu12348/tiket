import type { FormField, FormFieldOptions, FieldType } from "@/types/form";
import type { LocalField, StandardField } from "../types";

export const CHOICE_BASED_FIELD_TYPES: FieldType[] = [
  "single_select",
  "multi_select",
];

export const MULTI_CHOICE_FIELD_TYPES: FieldType[] = [
  "multi_select",
];

export function isChoiceField(type: FieldType): boolean {
  return CHOICE_BASED_FIELD_TYPES.includes(type);
}

export function isMultiChoiceField(type: FieldType): boolean {
  return MULTI_CHOICE_FIELD_TYPES.includes(type);
}

export function buildOptionsPayload(
  fieldType: FieldType,
  options: string[] | null,
  minOptions?: number | null,
  maxOptions?: number | null,
  allowCustom?: boolean | null,
  isMulti?: boolean | null,
): FormFieldOptions {
  if (!isChoiceField(fieldType) || !options) {
    return null;
  }

  const validChoices = options
    .map((opt) => opt.trim())
    .filter(Boolean);

  if (validChoices.length === 0) {
    return null;
  }

  const hasMin = typeof minOptions === "number";
  const hasMax = typeof maxOptions === "number";
  const hasCustom = Boolean(allowCustom);
  const hasMulti = typeof isMulti === "boolean";

  if (hasMin || hasMax || hasCustom || hasMulti) {
    const payload: {
      choices: string[];
      min?: number | null;
      max?: number | null;
      allowCustom?: boolean | null;
      isMulti?: boolean | null;
    } = {
      choices: validChoices,
      min: hasMin ? minOptions : null,
      max: hasMax ? maxOptions : null,
      allowCustom: hasCustom,
    };
    if (hasMulti) {
      payload.isMulti = isMulti;
    }
    return payload;
  }

  return validChoices;
}

export function serverToLocal(field: FormField): LocalField {
  let parsedOptions: string[] | null = null;
  let minOptions: number | null = null;
  let maxOptions: number | null = null;
  let allowCustom = false;
  let isMulti = false;

  if (field.options) {
    if (Array.isArray(field.options)) {
      parsedOptions = field.options;
      isMulti = field.fieldType === "multi_select";
    } else if (typeof field.options === "object") {
      const optObj = field.options;
      parsedOptions = Array.isArray(optObj.choices) ? optObj.choices : [];
      minOptions = typeof optObj.min === "number" ? optObj.min : null;
      maxOptions = typeof optObj.max === "number" ? optObj.max : null;
      allowCustom = Boolean(optObj.allowCustom);
      isMulti =
        typeof optObj.isMulti === "boolean"
          ? optObj.isMulti
          : field.fieldType === "multi_select";
    }
  }

  return {
    localId: field.id, // Server id as localId
    serverId: field.id,
    name: field.name,
    label: field.label,
    fieldType: field.fieldType,
    isRequired: field.isRequired,
    options: parsedOptions,
    allowCustom,
    isMulti,
    minOptions,
    maxOptions,
    conditions: field.conditions ?? null,
    sortOrder: field.sortOrder ?? 0,
    page: field.page ?? 1,
  };
}

export function localToFormFields(
  customFields: LocalField[],
  standardFields: StandardField[],
  eventId: string,
): FormField[] {
  const result: FormField[] = [];
  const now = new Date().toISOString();

  // Standard fields
  for (const std of standardFields) {
    if (std.status === "Off") continue;
    const isLocked = std.name === "name" || std.name === "email";
    result.push({
      id: std.serverId || crypto.randomUUID(),
      eventId,
      name: std.name,
      label: std.label,
      fieldType:
        std.name === "email" ? "email" : std.name === "phone" ? "phone" : "text",
      isRequired: isLocked ? true : std.status === "Required",
      isLocked,
      options: null,
      conditions: null,
      sortOrder: std.name === "name" ? 0 : std.name === "email" ? 1 : 2,
      page: 1,
      createdAt: now,
    });
  }

  // Custom fields
  for (const f of customFields) {
    result.push({
      id: f.serverId || f.localId,
      eventId,
      name: f.name,
      label: f.label,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      isLocked: false,
      options: buildOptionsPayload(
        f.fieldType,
        f.options,
        f.minOptions,
        f.maxOptions,
        f.allowCustom,
        f.isMulti,
      ),
      conditions: f.conditions ?? null,
      sortOrder: f.sortOrder,
      page: f.page,
      createdAt: now,
    });
  }

  return result;
}

export function getPagesFromFields(
  fields: LocalField[],
  extraPages: number[] = [1],
): number[] {
  const pageNums = new Set<number>(extraPages);
  fields.forEach((f) => {
    if (typeof f.page === "number" && f.page > 0) {
      pageNums.add(f.page);
    }
  });
  if (pageNums.size === 0) {
    pageNums.add(1);
  }
  return Array.from(pageNums).sort((a, b) => a - b);
}

export function getActivePageFields(
  fields: LocalField[],
  activePage: number,
): LocalField[] {
  return fields
    .filter((f) => f.page === activePage)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
