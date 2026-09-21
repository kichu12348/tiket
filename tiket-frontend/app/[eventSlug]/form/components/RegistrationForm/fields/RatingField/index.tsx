import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldRendererProps } from "../../types";
import styles from "./RatingField.module.css";

export default function RatingField({ field, control }: FieldRendererProps) {
  const opts = field.options as {
    min: number | null;
    max: number | null;
    choices: string[];
  } | null;

  const max = opts?.max ?? 5;
  const min = opts?.min ?? 1;
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <Controller
      name={field.id}
      control={control}
      render={({ field: f }) => (
        <div className={styles.ratingGroup}>
          {ticks.map((val) => (
            <Button
              key={val}
              type="button"
              variant="ghost"
              className={`${styles.ratingBtn} ${f.value === String(val) ? styles.ratingBtnActive : ""}`}
              onClick={() => f.onChange(String(val))}
            >
              {val}
            </Button>
          ))}
        </div>
      )}
    />
  );
}
