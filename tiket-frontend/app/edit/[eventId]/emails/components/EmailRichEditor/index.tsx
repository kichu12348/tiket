"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  MousePointerClick,
  X,
} from "lucide-react";
import Modal from "@/components/Modal";
import styles from "./EmailRichEditor.module.css";

export interface EmailRichEditorRef {
  insertVariable: (variableKey: string) => void;
}

interface EmailRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const EmailRichEditor = forwardRef<EmailRichEditorRef, EmailRichEditorProps>(
  ({ value, onChange, placeholder = "Compose email content visually..." }, ref) => {
    const [isButtonModalOpen, setIsButtonModalOpen] = useState(false);
    const [buttonLabel, setButtonLabel] = useState("View Your Pass");
    const [buttonUrl, setButtonUrl] = useState("{{event.passUrl}}");
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            style: "color: #2563eb; text-decoration: underline;",
          },
        }),
        Image,
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    // Sync external value changes (e.g. template selection or reset)
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    // Expose insertVariable method to parent
    useImperativeHandle(ref, () => ({
      insertVariable: (variableKey: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(` ${variableKey} `).run();
      },
    }));

    if (!editor) return null;

    const handleInsertCtaButton = () => {
      if (!buttonLabel.trim() || !buttonUrl.trim()) return;

      const buttonHtml = `
<p style="text-align: center; margin: 28px 0;">
  <a href="${buttonUrl.trim()}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
    ${buttonLabel.trim()}
  </a>
</p>
`.trim();

      editor.chain().focus().insertContent(buttonHtml).run();
      setIsButtonModalOpen(false);
      setButtonLabel("View Your Pass");
      setButtonUrl("{{event.passUrl}}");
    };

    const handleInsertLink = () => {
      if (!linkUrl.trim()) {
        setIsLinkModalOpen(false);
        return;
      }
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
      setIsLinkModalOpen(false);
      setLinkUrl("");
    };

    return (
      <div className={styles.editorContainer}>
        {/* Formatting Toolbar */}
        <div className={styles.toolbar} onMouseDown={(e) => e.preventDefault()}>
          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("bold") ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={16} />
          </button>

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("italic") ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("heading", { level: 1 }) ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("heading", { level: 2 }) ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("bulletList") ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={16} />
          </button>

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("orderedList") ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("blockquote") ? styles.activeBtn : ""}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>

          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Insert Line Divider"
          >
            <Minus size={16} />
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={`${styles.toolbarBtn} ${editor.isActive("link") ? styles.activeBtn : ""}`}
            onClick={() => {
              setLinkUrl(editor.getAttributes("link").href || "");
              setIsLinkModalOpen(true);
            }}
            title="Insert Link"
          >
            <LinkIcon size={16} />
          </button>

          <button
            type="button"
            className={styles.ctaButtonBtn}
            onClick={() => setIsButtonModalOpen(true)}
            title="Insert Button CTA Link"
          >
            <MousePointerClick size={16} />
            <span>Add CTA Button</span>
          </button>
        </div>

        {/* Crisp White Paper Canvas */}
        <div className={styles.paperCanvasWrapper}>
          <div className={styles.paperCanvas}>
            <EditorContent editor={editor} className={styles.editorContent} />
          </div>
        </div>

        {/* CTA Button Generator Modal */}
        <Modal
          isOpen={isButtonModalOpen}
          onClose={() => setIsButtonModalOpen(false)}
          title="Insert Call-to-Action Button"
          width={450}
        >
          <div className={styles.modalBody}>
            <p className={styles.modalHint}>
              Generate a high-converting CTA button formatted for email inboxes.
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Button Text</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. View Digital Pass"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target URL / Variable</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. {{event.passUrl}} or https://..."
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsButtonModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleInsertCtaButton}
                disabled={!buttonLabel.trim() || !buttonUrl.trim()}
              >
                Insert Button
              </button>
            </div>
          </div>
        </Modal>

        {/* Link Modal */}
        <Modal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          title="Insert Hyperlink"
          width={420}
        >
          <div className={styles.modalBody}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>URL Address</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsLinkModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleInsertLink}
              >
                Apply Link
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
);

EmailRichEditor.displayName = "EmailRichEditor";

export default EmailRichEditor;
