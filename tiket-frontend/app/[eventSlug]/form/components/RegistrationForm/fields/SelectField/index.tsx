import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import type { FieldRendererProps } from "../../types";
import styles from "./SelectField.module.css";

export default function SelectField({ field, control }: FieldRendererProps) {
  const optionsObj = (
    field.options &&
    typeof field.options === "object" &&
    !Array.isArray(field.options)
      ? field.options
      : null
  ) as { choices?: string[]; min?: number | null; max?: number | null } | null;

  const rawChoices = Array.isArray(field.options)
    ? (field.options as string[])
    : (optionsObj?.choices ?? []);

  const choices =
    rawChoices.length > 0
      ? rawChoices
      : field.fieldType === "checkbox"
        ? [field.label]
        : [];

  const choicesCount = choices.length;
  const rawMin = optionsObj?.min ?? null;
  const rawMax = optionsObj?.max ?? null;

  const min =
    rawMin != null && rawMin > 0
      ? choicesCount > 0
        ? Math.min(rawMin, choicesCount)
        : rawMin
      : null;
  const max =
    rawMax != null && rawMax > 0
      ? choicesCount > 0
        ? Math.min(rawMax, choicesCount)
        : rawMax
      : null;

  const isMulti =
    field.fieldType === "multi_select" || field.fieldType === "checkbox";

  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue={isMulti ? [] : ""}
      render={({ field: f }) => {
        if (isMulti) {
          const values: string[] = Array.isArray(f.value) ? f.value : [];

          const toggle = (choice: string) => {
            if (values.includes(choice)) {
              f.onChange(values.filter((v) => v !== choice));
            } else {
              if (max != null && max > 0 && values.length >= max) {
                return;
              }
              f.onChange([...values, choice]);
            }
          };

          const isMaxReached = max != null && max > 0 && values.length >= max;

          let metaText = "";
          if (min != null && max != null) {
            if (min === max) {
              metaText = `Select exactly ${min} option${min > 1 ? "s" : ""} (${values.length}/${max} selected)`;
            } else {
              metaText = `Select ${min} to ${max} options (${values.length}/${max} selected)`;
            }
          } else if (min != null && min > 0) {
            metaText = `Select at least ${min} option${min > 1 ? "s" : ""} (${values.length} selected)`;
          } else if (max != null && max > 0) {
            metaText = `Select up to ${max} option${max > 1 ? "s" : ""} (${values.length}/${max} selected)`;
          } else if (values.length > 0) {
            metaText = `${values.length} option${values.length > 1 ? "s" : ""} selected`;
          }

          return (
            <div className={styles.container}>
              {(metaText || values.length > 0) && (
                <div className={styles.metaRow}>
                  {metaText ? (
                    <span className={styles.selectionMeta}>{metaText}</span>
                  ) : (
                    <span />
                  )}
                  {values.length > 0 && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => f.onChange([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
              <div className={`${styles.checkboxList} scrollbar`}>
                {choices.map((choice, idx) => {
                  const isSelected = values.includes(choice);
                  const isDisabled = !isSelected && isMaxReached;
                  const optionId = `field-${field.id}-${idx}`;

                  return (
                    <label
                      key={choice}
                      htmlFor={optionId}
                      className={`${styles.checkboxItem} ${
                        isSelected ? styles.checkboxItemActive : ""
                      } ${isDisabled ? styles.checkboxItemDisabled : ""}`}
                      data-checked={isSelected}
                      data-disabled={isDisabled}
                    >
                      <Checkbox
                        id={optionId}
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => toggle(choice)}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxLabelText}>{choice}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div className={styles.choiceGroup}>
            {choices.map((choice) => (
              <Button
                key={choice}
                type="button"
                variant="ghost"
                className={`${styles.choiceBtn} ${
                  f.value === choice ? styles.choiceBtnActive : ""
                }`}
                onClick={() => f.onChange(choice)}
              >
                {f.value === choice && <Check size={14} />}
                {choice}
              </Button>
            ))}
          </div>
        );
      }}
    />
  );
}
