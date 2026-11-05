"use client";

import React from "react";
import type { FormField, VisibilityConditionRule } from "@/types/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import styles from "./ConditionBuilder.module.css";

interface ConditionBuilderProps {
  conditions: VisibilityConditionRule[];
  onChange: (conditions: VisibilityConditionRule[]) => void;
  availableFields: FormField[];
  title?: string;
}

function extractChoices(options: FormField["options"]): string[] {
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

export default function ConditionBuilder({
  conditions,
  onChange,
  availableFields,
  title,
}: ConditionBuilderProps) {
  if (availableFields.length === 0) {
    return (
      <div className={styles.emptyNotice}>
        No form questions created yet. Create a form question first to base conditions on it.
      </div>
    );
  }

  const handleAddRule = () => {
    const defaultField = availableFields[0];
    const newRule: VisibilityConditionRule = {
      fieldId: defaultField?.id || "",
      allowedValues: [],
    };
    onChange([...conditions, newRule]);
  };

  const handleRemoveRule = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, newFieldId: string) => {
    const updated = [...conditions];
    updated[index] = {
      fieldId: newFieldId,
      allowedValues: [],
    };
    onChange(updated);
  };

  const handleToggleValue = (
    index: number,
    value: string,
    isChecked: boolean,
  ) => {
    const updated = [...conditions];
    const currentRule = updated[index];
    if (!currentRule) return;

    const currentAllowed = currentRule.allowedValues || [];
    const newAllowed = isChecked
      ? currentAllowed.includes(value)
        ? currentAllowed
        : [...currentAllowed, value]
      : currentAllowed.filter((v) => v !== value);

    updated[index] = {
      ...currentRule,
      allowedValues: newAllowed,
    };
    onChange(updated);
  };

  const handleTextInputChange = (index: number, textValue: string) => {
    const updated = [...conditions];
    const currentRule = updated[index];
    if (!currentRule) return;

    updated[index] = {
      ...currentRule,
      allowedValues: textValue ? [textValue] : [],
    };
    onChange(updated);
  };

  return (
    <div className={styles.container}>
      {title && <span className={styles.ruleLabel}>{title}</span>}

      {conditions.map((rule, idx) => {
        const targetField = availableFields.find((f) => f.id === rule.fieldId);
        const choices = targetField ? extractChoices(targetField.options) : [];
        const hasChoices = choices.length > 0;

        return (
          <div key={`${rule.fieldId}-${idx}`} className={styles.ruleRow}>
            <span className={styles.ruleLabel}>IF</span>

            {/* Radix UI Select for Form Question */}
            <div className={styles.questionSelectWrapper}>
              <Select
                value={rule.fieldId}
                onValueChange={(val) => handleFieldChange(idx, val)}
              >
                <SelectTrigger className="w-full bg-white/[0.05] border-white/10 text-white text-xs h-9">
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

            <span className={styles.ruleLabel}>IS</span>

            {/* Radix UI Popover + Checkbox multi-select list (or Input if text field) */}
            <div className={styles.valuePickerWrapper}>
              {hasChoices ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={styles.valuePickerBtn}
                      style={{ height: "2.25rem", fontSize: "0.8rem" }}
                    >
                      <span className="truncate">
                        {rule.allowedValues.length === 0 ? (
                          <span className={styles.placeholderText}>
                            Select value(s)...
                          </span>
                        ) : rule.allowedValues.length === 1 ? (
                          rule.allowedValues[0]
                        ) : (
                          `${rule.allowedValues.length} values selected`
                        )}
                      </span>
                      <ChevronDown size={14} className="opacity-50 ml-1 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 p-2 bg-[#1c1c1e] border-white/10 text-white z-[9999]"
                    align="start"
                  >
                    <div className={styles.popoverChoicesList}>
                      {choices.map((choice) => {
                        const isChecked = rule.allowedValues.includes(choice);
                        return (
                          <label
                            key={choice}
                            className={styles.checkboxOption}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleToggleValue(idx, choice, Boolean(checked))
                              }
                            />
                            <span className="text-xs select-none">
                              {choice}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  className="bg-white/[0.05] border-white/10 text-white text-xs h-9"
                  placeholder="Expected value..."
                  value={rule.allowedValues[0] || ""}
                  onChange={(e) => handleTextInputChange(idx, e.target.value)}
                />
              )}
            </div>

            <button
              type="button"
              className={styles.deleteRuleBtn}
              onClick={() => handleRemoveRule(idx)}
              title="Remove condition"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

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

