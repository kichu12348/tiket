import { FormField } from "@/types/form";
import { LocalField } from "../types";

export function serverToLocal(field: FormField): LocalField {
  let parsedOptions: string[] | null = null;
  let minOptions: number | null = null;
  let maxOptions: number | null = null;

  if (field.options) {
    if (Array.isArray(field.options)) {
      parsedOptions = field.options as string[];
    } else if (typeof field.options === "object") {
      const optObj = field.options as any;
      parsedOptions = Array.isArray(optObj.choices) ? optObj.choices : [];
      minOptions = typeof optObj.min === "number" ? optObj.min : null;
      maxOptions = typeof optObj.max === "number" ? optObj.max : null;
    }
  }

  return {
    localId: field.id, // We use server id as localId when available
    serverId: field.id,
    name: field.name,
    label: field.label,
    fieldType: field.fieldType as any,
    isRequired: field.isRequired,
    options: parsedOptions,
    minOptions,
    maxOptions,
    sortOrder: field.sortOrder,
    page: field.page,
  };
}

export function getPagesFromFields(fields: LocalField[]): number[] {
  const pageNums = new Set(fields.map((f) => f.page));
  return Array.from(pageNums).sort((a, b) => a - b);
}

export function getActivePageFields(fields: LocalField[], activePage: number): LocalField[] {
  return fields
    .filter((f) => f.page === activePage)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
