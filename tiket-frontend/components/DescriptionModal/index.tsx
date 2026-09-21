import { useState, useEffect } from "react";
import styles from "./DescriptionModal.module.css";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import RichTextEditor from "./RichTextEditor";

interface DescriptionModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function DescriptionModal({
  isOpen,
  initialValue,
  onClose,
  onSave,
}: DescriptionModalProps) {
  const [value, setValue] = useState(initialValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      // Small timeout to ensure it renders before any focusing
      setTimeout(() => {
        // TipTap handles its own focus if we want, but we can leave this here
      }, 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen || !mounted) return null;

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing it
      >
        <div className={styles.header}>
          <span className={styles.title}>Event Description</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <RichTextEditor
          initialValue={value}
          onChange={(val) => setValue(val)}
        />

        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
