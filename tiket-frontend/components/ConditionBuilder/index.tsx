"use client";

import { Plus } from "lucide-react";
import type {
  VisibilityConditionOperator,
  VisibilityConditionRule,
} from "@/types/form";
import styles from "./ConditionBuilder.module.css";
import type { ConditionBuilderProps } from "./types";
import { parseConditions } from "./functions/conditionHelpers";
import EmptyNotice from "./components/EmptyNotice";
import MatchCombinator from "./components/MatchCombinator";
import RuleRow from "./components/RuleRow";

export type { ConditionBuilderProps } from "./types";

export default function ConditionBuilder({
  conditions,
  onChange,
  availableFields,
  title,
}: ConditionBuilderProps) {
  if (availableFields.length === 0) {
    return <EmptyNotice />;
  }

  const { match, rules } = parseConditions(conditions);

  const emitChange = (
    newMatch: "all" | "any",
    newRules: VisibilityConditionRule[],
  ) => {
    onChange({ match: newMatch, rules: newRules });
  };

  const handleAddRule = () => {
    const defaultField = availableFields[0];
    const newRule: VisibilityConditionRule = {
      fieldId: defaultField?.id || "",
      operator: "equals",
      allowedValues: [],
    };
    emitChange(match, [...rules, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    emitChange(
      match,
      rules.filter((_, i) => i !== index),
    );
  };

  const handleMatchChange = (newMatch: "all" | "any") => {
    emitChange(newMatch, rules);
  };

  const handleFieldChange = (index: number, newFieldId: string) => {
    const updated = [...rules];
    const current = updated[index];
    updated[index] = {
      fieldId: newFieldId,
      operator: current?.operator ?? "equals",
      allowedValues: [],
    };
    emitChange(match, updated);
  };

  const handleOperatorChange = (
    index: number,
    newOperator: VisibilityConditionOperator,
  ) => {
    const updated = [...rules];
    const current = updated[index];
    if (!current) return;
    updated[index] = {
      ...current,
      operator: newOperator,
      allowedValues:
        newOperator !== "in" && current.allowedValues.length > 1
          ? [current.allowedValues[0]!]
          : current.allowedValues,
    };
    emitChange(match, updated);
  };

  const handleSetSingleValue = (index: number, val: string) => {
    const updated = [...rules];
    const current = updated[index];
    if (!current) return;
    updated[index] = {
      ...current,
      allowedValues: val ? [val] : [],
    };
    emitChange(match, updated);
  };

  const handleSetMultiValues = (index: number, values: string[]) => {
    const updated = [...rules];
    const current = updated[index];
    if (!current) return;
    updated[index] = {
      ...current,
      allowedValues: values,
    };
    emitChange(match, updated);
  };

  return (
    <div className={styles.container}>
      {title && <span className={styles.ruleLabel}>{title}</span>}

      {rules.length >= 2 && (
        <MatchCombinator match={match} onChange={handleMatchChange} />
      )}

      {rules.map((rule, idx) => (
        <RuleRow
          key={`${rule.fieldId}-${idx}`}
          rule={rule}
          index={idx}
          match={match}
          availableFields={availableFields}
          onRemove={handleRemoveRule}
          onFieldChange={handleFieldChange}
          onOperatorChange={handleOperatorChange}
          onSingleValueChange={handleSetSingleValue}
          onMultiValuesChange={handleSetMultiValues}
        />
      ))}

      <button
        type="button"
        className={styles.addRuleBtn}
        onClick={handleAddRule}
      >
        <Plus size={14} />
        Add Condition Rule
      </button>
    </div>
  );
}
