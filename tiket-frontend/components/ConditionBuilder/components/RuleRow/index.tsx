import React from "react";
import { Trash2 } from "lucide-react";
import type { VisibilityConditionOperator } from "@/types/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "./RuleRow.module.css";
import type { RuleRowProps } from "../../types";
import { extractChoices } from "../../functions/conditionHelpers";
import ConditionTagInput from "../ConditionTagInput";
import SingleValuePicker from "../SingleValuePicker";

export default function RuleRow({
  rule,
  index,
  match,
  availableFields,
  onRemove,
  onFieldChange,
  onOperatorChange,
  onSingleValueChange,
  onMultiValuesChange,
}: RuleRowProps) {
  const targetField = availableFields.find(
    (f) => f.id === rule.fieldId || f.name === rule.fieldId,
  );
  const isChoiceField =
    targetField?.fieldType === "single_select" ||
    targetField?.fieldType === "multi_select";
  const choices =
    isChoiceField && targetField ? extractChoices(targetField.options) : [];
  const operator: VisibilityConditionOperator =
    rule.operator || (rule.allowedValues.length > 1 ? "in" : "equals");

  return (
    <React.Fragment>
      {index > 0 && (
        <div className={styles.ruleConnector}>
          <span className={styles.connectorBadge}>
            {match === "all" ? "AND" : "OR"}
          </span>
        </div>
      )}

      <div className={styles.ruleRow}>
        <div className={styles.ruleHeader}>
          <span className={styles.ruleLabel}>IF</span>
          <button
            type="button"
            className={styles.deleteRuleBtn}
            onClick={() => onRemove(index)}
            title="Remove condition"
            aria-label="Remove condition"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Question & Operator */}
        <div className={styles.ruleSelectors}>
          {/* 1. Form Question Select */}
          <div className={styles.questionSelectWrapper}>
            <Select
              value={rule.fieldId}
              onValueChange={(val) => onFieldChange(index, val)}
            >
              <SelectTrigger className="w-full bg-white/[0.05] border-none text-white text-xs h-9">
                <SelectValue placeholder="Select a question..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1c1e] border-white/10 text-white z-[9999]">
                {availableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Operator Select */}
          <div className={styles.operatorSelectWrapper}>
            <Select
              value={operator}
              onValueChange={(val) =>
                onOperatorChange(index, val as VisibilityConditionOperator)
              }
            >
              <SelectTrigger className="w-full bg-white/[0.05] border-none text-white text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1c1c1e] border-white/10 text-white z-[9999]">
                <SelectItem value="equals" className="text-xs">
                  Equals
                </SelectItem>
                <SelectItem value="not_equals" className="text-xs">
                  Does not equal
                </SelectItem>
                <SelectItem value="in" className="text-xs">
                  Is one of
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3. Value Input */}
        <div className={styles.valuePickerWrapper}>
          {operator === "in" ? (
            <ConditionTagInput
              values={rule.allowedValues}
              onChange={(newVals) => onMultiValuesChange(index, newVals)}
              choices={choices}
              isChoiceField={isChoiceField}
            />
          ) : (
            <SingleValuePicker
              value={rule.allowedValues[0] || ""}
              onChange={(val) => onSingleValueChange(index, val)}
              choices={choices}
              isChoiceField={isChoiceField}
            />
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
