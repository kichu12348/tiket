import { useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";
import type { FieldRendererProps } from "../../types";
import { extractChoices } from "../../utils";
import styles from "./SelectField.module.css";

export default function SelectField({ field, control }: FieldRendererProps) {
  const optionsObj = (
    field.options &&
    typeof field.options === "object" &&
    !Array.isArray(field.options)
      ? field.options
      : null
  ) as {
    choices?: string[];
    min?: number | null;
    max?: number | null;
    allowCustom?: boolean | null;
    isMulti?: boolean | null;
  } | null;

  const allowCustom = Boolean(optionsObj?.allowCustom);
  const choices = extractChoices(field.options);
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
    field.fieldType === "multi_select" && optionsObj?.isMulti !== false;

  const [isOtherActive, setIsOtherActive] = useState(false);
  const [customText, setCustomText] = useState("");
  const [isOtherMultiChecked, setIsOtherMultiChecked] = useState(false);
  const [otherMultiText, setOtherMultiText] = useState("");

  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue={isMulti ? [] : ""}
      render={({ field: f }) => {
        if (isMulti) {
          const values: string[] = Array.isArray(f.value) ? f.value : [];
          const customInValues = values.find((v) => !choices.includes(v)) ?? "";
          const effectiveOtherChecked =
            isOtherMultiChecked || Boolean(customInValues);
          const effectiveOtherText = otherMultiText || customInValues;

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

          const handleToggleOtherMulti = () => {
            if (effectiveOtherChecked) {
              setIsOtherMultiChecked(false);
              setOtherMultiText("");
              f.onChange(values.filter((v) => choices.includes(v)));
            } else {
              if (max != null && max > 0 && values.length >= max) {
                return;
              }
              setIsOtherMultiChecked(true);
            }
          };

          const handleOtherTextChange = (text: string) => {
            setOtherMultiText(text);
            const standardOnly = values.filter((v) => choices.includes(v));
            if (text.trim()) {
              f.onChange([...standardOnly, text.trim()]);
            } else {
              f.onChange(standardOnly);
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
                      onClick={() => {
                        setIsOtherMultiChecked(false);
                        setOtherMultiText("");
                        f.onChange([]);
                      }}
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

                {allowCustom && (
                  <div className={styles.otherCheckboxBlock}>
                    <label
                      htmlFor={`field-${field.id}-other`}
                      className={`${styles.checkboxItem} ${
                        effectiveOtherChecked ? styles.checkboxItemActive : ""
                      } ${!effectiveOtherChecked && isMaxReached ? styles.checkboxItemDisabled : ""}`}
                    >
                      <Checkbox
                        id={`field-${field.id}-other`}
                        checked={effectiveOtherChecked}
                        disabled={!effectiveOtherChecked && isMaxReached}
                        onCheckedChange={handleToggleOtherMulti}
                        className={styles.checkbox}
                      />
                      <span className={styles.checkboxLabelText}>Other</span>
                    </label>
                    {effectiveOtherChecked && (
                      <input
                        type="text"
                        placeholder="Please specify..."
                        value={effectiveOtherText}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        className={styles.customInput}
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

        const isPredefined = choices.includes(f.value);
        const effectiveOtherActive =
          isOtherActive || (Boolean(f.value) && !isPredefined);
        const effectiveOtherText = customText || (!isPredefined ? f.value : "");

        const handleSingleSelect = (choice: string) => {
          setIsOtherActive(false);
          setCustomText("");
          if (f.value === choice && !field.isRequired) {
            f.onChange("");
          } else {
            f.onChange(choice);
          }
        };

        const handleOtherSelect = () => {
          if (effectiveOtherActive) {
            if (!field.isRequired) {
              setIsOtherActive(false);
              setCustomText("");
              f.onChange("");
            }
          } else {
            setIsOtherActive(true);
            f.onChange(effectiveOtherText || "");
          }
        };

        const handleOtherTextChange = (text: string) => {
          setCustomText(text);
          f.onChange(text);
        };

        return (
          <div className={styles.container}>
            <div className={styles.choiceGroup}>
              {choices.map((choice) => (
                <Button
                  key={choice}
                  type="button"
                  variant="ghost"
                  className={`${styles.choiceBtn} ${
                    f.value === choice ? styles.choiceBtnActive : ""
                  }`}
                  onClick={() => handleSingleSelect(choice)}
                >
                  {f.value === choice && <Check size={14} />}
                  {choice}
                </Button>
              ))}

              {allowCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  className={`${styles.choiceBtn} ${
                    effectiveOtherActive ? styles.choiceBtnActive : ""
                  }`}
                  onClick={handleOtherSelect}
                >
                  {effectiveOtherActive && <Check size={14} />}
                  Other
                </Button>
              )}
            </div>

            {allowCustom && effectiveOtherActive && (
              <div className={styles.customInputWrapper}>
                <input
                  type="text"
                  placeholder="Please specify..."
                  value={effectiveOtherText}
                  onChange={(e) => handleOtherTextChange(e.target.value)}
                  className={styles.customInput}
                  autoFocus
                />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
