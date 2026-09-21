import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FiAlertCircle } from "react-icons/fi";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DynamicField from "../fields/DynamicField";
import { FormFieldsSectionProps } from "../types";
import styles from "./FormFieldsSection.module.css";

export default function FormFieldsSection({
  currentPage,
  maxPage,
  pages,
  control,
  errors,
  timezone,
  onNext,
  onBack,
}: FormFieldsSectionProps) {
  const currentPageFields = pages[currentPage] ?? [];
  const canGoNext = currentPage < maxPage;
  const canGoBack = currentPage > 1;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Registration Details</span>
        {maxPage > 1 && (
          <span className={styles.pageIndicator}>
            Step {currentPage} of {maxPage}
          </span>
        )}
      </div>

      {maxPage > 1 && (
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${(currentPage / maxPage) * 100}%` }}
          />
        </div>
      )}

      <div className={styles.fieldList}>
        {currentPageFields.map((field) => (
          <div key={field.id} className={styles.fieldGroup}>
            <Label htmlFor={`field-${field.id}`} className={styles.fieldLabel}>
              {field.label}
              {field.isRequired && (
                <span className={styles.required}>*</span>
              )}
            </Label>

            <DynamicField
              field={field}
              control={control}
              error={errors[field.id]}
              timezone={timezone}
            />

            {errors[field.id] && (
              <span className={styles.errorText}>
                <FiAlertCircle size={12} />
                {String(errors[field.id]?.message ?? "This field is required")}
              </span>
            )}
          </div>
        ))}
      </div>

      {maxPage > 1 && (
        <div className={styles.pageNav}>
          {canGoBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className={styles.navBtnSecondary}
            >
              <ChevronLeft size={16} /> Back
            </Button>
          )}
          {canGoNext && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onNext}
              className={styles.navBtnPrimary}
            >
              Continue <ChevronRight size={16} />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
