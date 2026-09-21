"use client";

import React from "react";
import { Editor } from "@tiptap/react";
import {
  RotateCcw,
  RotateCw,
  Monitor,
  Smartphone,
  Edit3,
  Eye,
  Code,
  Power,
} from "lucide-react";
import styles from "./TopControlBar.module.css";

interface TopControlBarProps {
  name: string;
  setName: (name: string) => void;
  templateType: string;
  editor: Editor;
  deviceView: "desktop" | "mobile";
  setDeviceView: (device: "desktop" | "mobile") => void;
  canvasMode: "edit" | "preview" | "code";
  setCanvasMode: (mode: "edit" | "preview" | "code") => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

export default function TopControlBar({
  name,
  setName,
  templateType,
  editor,
  deviceView,
  setDeviceView,
  canvasMode,
  setCanvasMode,
  isActive,
  setIsActive,
}: TopControlBarProps) {
  return (
    <div className={styles.topControlBar}>
      <div className={styles.metaRow}>
        <input
          type="text"
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template Name"
          required
        />
        <span className={styles.typeBadge} data-type={templateType}>
          {templateType}
        </span>
      </div>

      <div className={styles.rightBarGroup}>
        {/* Undo / Redo */}
        <div className={styles.undoRedoGroup}>
          <button
            type="button"
            className={styles.iconToolBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            className={styles.iconToolBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Device Toggle Switch (Desktop vs Mobile) */}
        <div className={styles.deviceSegmented}>
          <button
            type="button"
            className={styles.deviceBtn}
            data-active={deviceView === "desktop"}
            onClick={() => setDeviceView("desktop")}
            title="Desktop View (720px)"
          >
            <Monitor size={15} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={styles.deviceBtn}
            data-active={deviceView === "mobile"}
            onClick={() => setDeviceView("mobile")}
            title="Mobile View (375px)"
          >
            <Smartphone size={15} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Mode Switch (Edit / Preview / Code) */}
        <div className={styles.modeSegmented}>
          <button
            type="button"
            className={styles.modeBtn}
            data-active={canvasMode === "edit"}
            onClick={() => setCanvasMode("edit")}
            title="Visual Editor Mode"
          >
            <Edit3 size={14} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={styles.modeBtn}
            data-active={canvasMode === "preview"}
            onClick={() => setCanvasMode("preview")}
            title="Live Data Preview"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            className={styles.modeBtn}
            data-active={canvasMode === "code"}
            onClick={() => setCanvasMode("code")}
            title="HTML Code View"
          >
            <Code size={14} />
            <span>Code</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.activeStatusBtn}
          data-active={isActive}
          onClick={() => setIsActive(!isActive)}
          title={isActive ? "Template is Active" : "Template is Inactive"}
        >
          <Power size={14} />
          <span>{isActive ? "Active" : "Inactive"}</span>
        </button>
      </div>
    </div>
  );
}
