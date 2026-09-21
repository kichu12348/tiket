import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Image } from "@tiptap/extension-image";
import {
  Heading1,
  Heading2,
  Image as ImageIcon,
  Quote,
  Minus,
  List,
  ListOrdered,
  Bold,
  Italic,
  Link as LinkIcon,
  X,
} from "lucide-react";
import styles from "./RichTextEditor.module.css";

interface RichTextEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
}

type ModalType = "link" | "image" | null;

export default function RichTextEditor({
  initialValue,
  onChange,
}: RichTextEditorProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalUrl, setModalUrl] = useState("");
  const [modalLabel, setModalLabel] = useState("");
  const [, setForceUpdate] = useState(0);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({
        placeholder: "Describe your event",
      }),
    ],
    content: initialValue,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onTransaction: () => {
      setForceUpdate((x) => x + 1);
    },
  });

  useEffect(() => {
    if (activeModal && modalInputRef.current) {
      setTimeout(() => modalInputRef.current?.focus(), 50);
    }
  }, [activeModal]);

  if (!editor) {
    return null;
  }

  const openLinkModal = () => {
    // Pre-fill with existing link if cursor is on one
    const existingUrl = editor.getAttributes("link").href || "";
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    setModalUrl(existingUrl);
    setModalLabel(selectedText);
    setActiveModal("link");
  };

  const openImageModal = () => {
    setModalUrl("");
    setActiveModal("image");
  };

  const handleModalSubmit = () => {
    if (!modalUrl.trim()) {
      setActiveModal(null);
      return;
    }

    if (activeModal === "link") {
      if (modalLabel.trim()) {
        // Insert link with custom label text
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: modalLabel.trim(),
            marks: [
              {
                type: "link",
                attrs: { href: modalUrl.trim() },
              },
            ],
          })
          .run();
      } else {
        // Apply link to existing selection
        editor.chain().focus().setLink({ href: modalUrl.trim() }).run();
      }
    } else if (activeModal === "image") {
      editor.chain().focus().setImage({ src: modalUrl.trim() }).run();
    }

    setModalUrl("");
    setModalLabel("");
    setActiveModal(null);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleModalSubmit();
    }
    if (e.key === "Escape") {
      setActiveModal(null);
    }
  };

  return (
    <div className={styles.editorContainer}>
      {/* Fixed Toolbar */}
      <div className={styles.toolbar} onMouseDown={(e) => e.preventDefault()}>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("bold") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("italic") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={16} />
        </button>

        <div className={styles.toolbarDivider} />

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("heading", { level: 1 }) ? styles.toolbarBtnActive : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Heading"
        >
          <Heading1 size={16} />
        </button>

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("heading", { level: 2 }) ? styles.toolbarBtnActive : ""}`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Subheading"
        >
          <Heading2 size={16} />
        </button>

        <div className={styles.toolbarDivider} />

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("bulletList") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size={16} />
        </button>

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("orderedList") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>

        <div className={styles.toolbarDivider} />

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("blockquote") ? styles.toolbarBtnActive : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote size={16} />
        </button>

        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={16} />
        </button>

        <div className={styles.toolbarDivider} />

        <button
          type="button"
          className={`${styles.toolbarBtn} ${editor.isActive("link") ? styles.toolbarBtnActive : ""}`}
          onClick={openLinkModal}
          title="Insert Link"
        >
          <LinkIcon size={16} />
        </button>

        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={openImageModal}
          title="Insert Image"
        >
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Editor Area */}
      <div className={styles.editorWrapper}>
        <EditorContent editor={editor} />
      </div>

      {activeModal &&
        createPortal(
          <div
            className={styles.urlModalOverlay}
            onClick={() => setActiveModal(null)}
          >
            <div
              className={styles.urlModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.urlModalHeader}>
                <span className={styles.urlModalTitle}>
                  {activeModal === "link" ? "Insert Link" : "Insert Image"}
                </span>
                <button
                  className={styles.urlModalClose}
                  onClick={() => setActiveModal(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {activeModal === "link" && (
                <input
                  type="text"
                  className={styles.urlModalInput}
                  placeholder="Link text (optional)"
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  onKeyDown={handleModalKeyDown}
                />
              )}

              <input
                ref={modalInputRef}
                type="url"
                className={styles.urlModalInput}
                placeholder={
                  activeModal === "link"
                    ? "https://example.com"
                    : "https://example.com/image.jpg"
                }
                value={modalUrl}
                onChange={(e) => setModalUrl(e.target.value)}
                onKeyDown={handleModalKeyDown}
              />

              <div className={styles.urlModalFooter}>
                <button
                  className={styles.urlModalCancel}
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.urlModalSubmit}
                  onClick={handleModalSubmit}
                  disabled={!modalUrl.trim()}
                >
                  {activeModal === "link" ? "Insert Link" : "Insert Image"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
