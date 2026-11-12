"use client";

import React, { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import styles from "./ConditionTagInput.module.css";
import type { TagInputControlProps } from "../../types";

export default function ConditionTagInput({
  values,
  onChange,
  choices = [],
  isChoiceField = false,
}: TagInputControlProps) {
  const [inputVal, setInputVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTokens = (rawText: string) => {
    const tokens = rawText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return;

    const newValues = [...values];
    for (const token of tokens) {
      if (!newValues.some((v) => v.toLowerCase() === token.toLowerCase())) {
        newValues.push(token);
      }
    }
    onChange(newValues);
    setInputVal("");
    setIsOpen(false);
  };

  const handleSelectChoice = (choice: string) => {
    if (!values.some((v) => v.toLowerCase() === choice.toLowerCase())) {
      onChange([...values, choice]);
    }
    setInputVal("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTokens(inputVal);
    } else if (e.key === "Backspace" && inputVal === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) {
      addTokens(inputVal);
    }
    setIsOpen(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes(",")) {
      e.preventDefault();
      addTokens(pasted);
    }
  };

  const query = inputVal.toLowerCase().trim();
  const filteredChoices = isChoiceField
    ? choices.filter(
        (c) =>
          !values.some((v) => v.toLowerCase() === c.toLowerCase()) &&
          (query ? c.toLowerCase().includes(query) : true),
      )
    : [];

  const showDropdown = isChoiceField && isOpen && filteredChoices.length > 0;

  return (
    <div className={styles.container}>
      <Popover open={showDropdown} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <div
            className={styles.tagInputWrapper}
            onClick={() => inputRef.current?.focus()}
          >
            {values.map((val, i) => (
              <span key={`${val}-${i}`} className={styles.tag}>
                <span className={styles.tagText}>{val}</span>
                <button
                  type="button"
                  className={styles.removeTagBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(values.filter((_, idx) => idx !== i));
                  }}
                  aria-label={`Remove ${val}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              className={styles.tagInput}
              placeholder={
                values.length === 0
                  ? isChoiceField
                    ? "Type or select choices..."
                    : "Type values (press Enter or comma)..."
                  : ""
              }
              value={inputVal}
              onFocus={() => {
                if (isChoiceField && filteredChoices.length > 0) {
                  setIsOpen(true);
                }
              }}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (isChoiceField) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onPaste={handlePaste}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn("scrollbar", styles.popoverContent)}
        >
          {filteredChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.dropdownItem}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectChoice(choice);
              }}
            >
              <span className={styles.choiceText}>{choice}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
