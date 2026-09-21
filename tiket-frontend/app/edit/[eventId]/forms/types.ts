import { FieldType } from "@/types/form";

export { FIELD_TYPES } from "@/types/form";
export type { FieldType } from "@/types/form";

export interface LocalField {
  localId: string;
  serverId?: string;
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  options: string[] | null;
  minOptions?: number | null;
  maxOptions?: number | null;
  sortOrder: number;
  page: number;
  isEditing?: boolean;
}

export type StandardFieldStatus = "Required" | "Optional" | "Off";

export interface StandardField {
  name: string;
  icon: React.ReactNode;
  label: string;
  status: StandardFieldStatus;
  serverId?: string;
}
