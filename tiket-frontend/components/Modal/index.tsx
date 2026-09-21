import styles from "./Modal.module.css";
import { createPortal } from "react-dom";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  leftAction?: React.ReactNode;
  width?: string | number;
  className?: string;
  headerClassName?: string;
  withoutPadding?: boolean;
}

const addModalBodyClass = () => {
  document.body.classList.add("popover");
  document.documentElement.classList.add("popover");
};

const removeModalBodyClass = () => {
  document.body.classList.remove("popover");
  document.documentElement.classList.remove("popover");
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  leftAction,
  width,
  className = "",
  headerClassName = "",
  withoutPadding = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      addModalBodyClass();
    } else {
      removeModalBodyClass();
    }

    return () => {
      removeModalBodyClass();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${className} ${withoutPadding ? styles.withoutPadding : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={width ? { width, maxWidth: "90vw" } : undefined}
      >
        <div
          className={`${styles.modalHeader} ${headerClassName}`}
          style={leftAction ? { justifyContent: "space-between" } : undefined}
        >
          <div className={styles.headerLeft}>
            {leftAction && (
              <div className={styles.leftAction}>{leftAction}</div>
            )}
            {title && (
              <h2
                className={styles.modalTitle}
                style={
                  leftAction
                    ? {
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                      }
                    : undefined
                }
              >
                {title}
              </h2>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
