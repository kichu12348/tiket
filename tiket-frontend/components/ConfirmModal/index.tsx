"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import styles from "./ConfirmModal.module.css";

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  width?: number | string;
  onConfirm?: () => Promise<void> | void;
}

type ConfirmState = {
  isOpen: boolean;
  message: string | React.ReactNode;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

type Listener = (state: ConfirmState) => void;

let currentListener: Listener | null = null;

export const confirm = (
  message: string | React.ReactNode,
  options?: ConfirmOptions,
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (currentListener) {
      currentListener({
        isOpen: true,
        message,
        options: options || {},
        resolve,
      });
    } else {
      console.warn("ConfirmProvider is not mounted in the React tree");
      resolve(false);
    }
  });
};

export function ConfirmProvider() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    currentListener = setState;
    return () => {
      if (currentListener === setState) {
        currentListener = null;
      }
    };
  }, []);

  if (!state || !state.isOpen) return null;

  const handleClose = () => {
    state.resolve(false);
    setState({ ...state, isOpen: false });
  };

  const handleConfirm = async () => {
    if (state.options.onConfirm) {
      setIsConfirming(true);
      try {
        await state.options.onConfirm();
      } catch (error) {
        setIsConfirming(false);
        return; // Don't close modal if it threw
      }
      setIsConfirming(false);
    }

    state.resolve(true);
    setState({ ...state, isOpen: false });
  };

  const {
    title = "Confirm",
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = true,
    width = 400,
  } = state.options;

  return (
    <Modal
      isOpen={state.isOpen}
      onClose={() => !isConfirming && handleClose()}
      title={title}
      width={width}
    >
      <div className={styles.body}>
        <div className={styles.message}>{state.message}</div>
        <div className={styles.footer}>
          <button
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={isConfirming}
          >
            {cancelText}
          </button>
          <button
            className={danger ? styles.dangerBtn : styles.primaryBtn}
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
