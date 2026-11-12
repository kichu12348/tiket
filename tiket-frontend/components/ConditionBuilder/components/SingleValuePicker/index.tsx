"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./SingleValuePicker.module.css";
import type { SingleValuePickerProps } from "../../types";

export default function SingleValuePicker({
  value,
  onChange,
  choices = [],
  isChoiceField = false,
}: SingleValuePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = (value || "").toLowerCase().trim();
  const filteredChoices = isChoiceField
    ? choices.filter((c) => (query ? c.toLowerCase().includes(query) : true))
    : [];

  const showDropdown = isChoiceField && isOpen && filteredChoices.length > 0;

  const handleSelect = (choice: string) => {
    onChange(choice);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.container}>
      <Popover open={showDropdown} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            className={cn("text-xs h-9 w-full", styles.input)}
            placeholder={
              isChoiceField ? "Type or select a choice..." : "Expected value..."
            }
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (isChoiceField && e.target.value.trim() !== "") {
                setIsOpen(true);
              } else {
                setIsOpen(false);
              }
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn("scrollbar", styles.popoverContent)}
        >
          {filteredChoices.map((choice) => {
            const isSelected =
              value.trim().toLowerCase() === choice.toLowerCase();
            return (
              <button
                key={choice}
                type="button"
                className={cn(
                  styles.dropdownItem,
                  isSelected && styles.dropdownItemSelected,
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(choice);
                }}
              >
                <span className={styles.choiceText}>{choice}</span>
                {isSelected && <Check size={14} className={styles.checkIcon} />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
