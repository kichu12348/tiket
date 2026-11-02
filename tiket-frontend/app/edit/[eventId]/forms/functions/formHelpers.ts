import type { FormField, FormFieldOptions, FieldType } from "@/types/form";
import type { LocalField } from "../types";

export const CHOICE_BASED_FIELD_TYPES: FieldType[] = [
  "single_select",
  "multi_select",
  "radio",
  "checkbox",
  "select",
];

export const MULTI_CHOICE_FIELD_TYPES: FieldType[] = [
  "multi_select",
  "checkbox",
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

  if (isMultiChoiceField(fieldType)) {
    const hasMin = typeof minOptions === "number";
    const hasMax = typeof maxOptions === "number";
    if (hasMin || hasMax) {
      return {
        choices: validChoices,
        min: hasMin ? minOptions : null,
        max: hasMax ? maxOptions : null,
      };
    }
  }

  return validChoices;
}

export function serverToLocal(field: FormField): LocalField {
  let parsedOptions: string[] | null = null;
  let minOptions: number | null = null;
  let maxOptions: number | null = null;

  if (field.options) {
    if (Array.isArray(field.options)) {
      parsedOptions = field.options;
    } else if (typeof field.options === "object") {
      const optObj = field.options;
      parsedOptions = Array.isArray(optObj.choices) ? optObj.choices : [];
      minOptions = typeof optObj.min === "number" ? optObj.min : null;
      maxOptions = typeof optObj.max === "number" ? optObj.max : null;
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
    minOptions,
    maxOptions,
    sortOrder: field.sortOrder ?? 0,
    page: field.page ?? 1,
  };
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
