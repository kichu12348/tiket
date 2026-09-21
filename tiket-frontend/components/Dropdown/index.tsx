import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import styles from "./Dropdown.module.css";

interface DropdownOption<T> {
  label: string;
  value: T;
  desc?: string;
  LeftComponent?: React.ReactNode;
  RightComponent?: React.ReactNode;
}

interface DropdownProps<T> {
  options: DropdownOption<T>[];
  value: string;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  variant?: "default" | "dark";
  popoverPosition?: "top" | "bottom";
  popoverAlign?: "left" | "right";
  renderTriggerContent?: (
    selected: DropdownOption<T> | undefined,
  ) => React.ReactNode;
  renderOption?: (
    option: DropdownOption<T>,
    isSelected: boolean,
  ) => React.ReactNode;
  maxHeight?: string;
  alignSelf?: React.CSSProperties["alignSelf"];
  width?: React.CSSProperties["width"];
  btnWidth?: React.CSSProperties["width"];
  btnColor?: React.CSSProperties["backgroundColor"];
}

export default function Dropdown<T>({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className,
  triggerClassName,
  popoverClassName,
  variant = "default",
  popoverPosition = "bottom",
  popoverAlign = "left",
  renderTriggerContent,
  renderOption,
  maxHeight,
  alignSelf,
  width = "maxContent",
  btnWidth = "maxContent",
  btnColor,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const style: React.CSSProperties = {
    width,
    alignSelf: alignSelf || "unset",
  };

  const triggerClasses = [
    styles.triggerBtn,
    variant === "dark" ? styles.darkTrigger : "",
    triggerClassName || "",
  ]
    .filter(Boolean)
    .join(" ");

  const popoverClasses = [
    styles.popover,
    styles.scrollArea,
    variant === "dark" ? styles.darkPopover : "",
    popoverClassName || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${styles.container} ${className || ""}`} style={style}>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={triggerClasses}
            data-empty={!selectedOption}
            style={{
              width: btnWidth,
              ...(btnColor && { backgroundColor: btnColor }),
            }}
          >
            {renderTriggerContent ? (
              renderTriggerContent(selectedOption)
            ) : (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
              >
                {selectedOption?.LeftComponent}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <span>{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
              </div>
            )}
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={popoverClasses}
            side={popoverPosition}
            align={popoverAlign === "right" ? "end" : "start"}
            style={{
              width,
              maxHeight: maxHeight || "auto",
              overflowY: maxHeight ? "auto" : "visible",
              zIndex: 1000,
            }}
            sideOffset={6}
          >
            {options.map((option, index) => {
              const isSelected = value === option.value;
              return (
                <DropdownMenu.Item
                  key={`${String(option.value)}-${index}`}
                  asChild
                  onSelect={() => {
                    onChange(option.value);
                  }}
                >
                  <button
                    className={`${styles.optionItem} ${isSelected ? styles.selected : ""}`}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          {option.LeftComponent}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "0.15rem",
                            }}
                          >
                            <span>{option.label}</span>
                            {option.desc && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--color-text-secondary)",
                                  fontWeight: 400,
                                }}
                              >
                                {option.desc}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={14} className={styles.checkIcon} />
                        )}
                      </>
                    )}
                  </button>
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
