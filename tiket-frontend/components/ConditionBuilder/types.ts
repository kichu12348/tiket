import type {
  FormField,
  VisibilityConditionOperator,
  VisibilityConditionRule,
  VisibilityConditions,
  VisibilityConditionsConfig,
} from "@/types/form";

export interface ConditionBuilderProps {
  conditions: VisibilityConditions | null | undefined;
  onChange: (conditions: VisibilityConditionsConfig) => void;
  availableFields: FormField[];
  title?: string;
}

export interface TagInputControlProps {
  values: string[];
  onChange: (values: string[]) => void;
  choices?: string[];
  isChoiceField?: boolean;
}

export interface SingleValuePickerProps {
  value: string;
  onChange: (value: string) => void;
  choices?: string[];
  isChoiceField?: boolean;
}

export interface RuleRowProps {
  rule: VisibilityConditionRule;
  index: number;
  match: "all" | "any";
  availableFields: FormField[];
  onRemove: (index: number) => void;
  onFieldChange: (index: number, fieldId: string) => void;
  onOperatorChange: (
    index: number,
    operator: VisibilityConditionOperator,
  ) => void;
  onSingleValueChange: (index: number, val: string) => void;
  onMultiValuesChange: (index: number, values: string[]) => void;
}

export interface MatchCombinatorProps {
  match: "all" | "any";
  onChange: (match: "all" | "any") => void;
}
