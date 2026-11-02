import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FieldRendererProps } from "../../types";
import styles from "./RatingField.module.css";

const RATING_TICKS = [1, 2, 3, 4, 5];

export default function RatingField({ field, control }: FieldRendererProps) {
  return (
    <Controller
      name={field.id}
      control={control}
      defaultValue=""
      render={({ field: f }) => {
        const handleClick = (val: number) => {
          const strVal = String(val);
          if (f.value === strVal && !field.isRequired) {
            f.onChange("");
          } else {
            f.onChange(strVal);
          }
        };

        return (
          <div className={styles.ratingGroup}>
            {RATING_TICKS.map((val) => (
              <Button
                key={val}
                type="button"
                variant="ghost"
                className={`${styles.ratingBtn} ${
                  f.value === String(val) ? styles.ratingBtnActive : ""
                }`}
                onClick={() => handleClick(val)}
              >
                {val}
              </Button>
            ))}
          </div>
        );
      }}
    />
  );
}
