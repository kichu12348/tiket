import React from "react";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  id?: string;
}

export default function Switch({ checked, onChange, className, id }: SwitchProps) {
  const state = checked ? "checked" : "unchecked";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={state}
      value="on"
      id={id}
      className={`${styles.container} ${className || ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} data-state={state}></span>
    </button>
  );
}
