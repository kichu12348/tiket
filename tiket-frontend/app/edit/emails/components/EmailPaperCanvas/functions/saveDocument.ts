import type { Editor } from "@tiptap/core";
import type {
  EmailTemplate,
  EmailDocumentJSON,
  EmailNodeJSON,
} from "@/types/email";
import { normalizeEmailDocumentDoc } from "@/utils/emailJsonCompiler";

export interface BuildSavePayloadParams {
  name: string;
  subject: string;
  isActive: boolean;
  editor: Editor | null;
  template: EmailTemplate;
}

export function buildEmailSavePayload({
  name,
  subject,
  isActive,
  editor,
  template,
}: BuildSavePayloadParams): Partial<EmailTemplate> {
  const docJson = editor
    ? normalizeEmailDocumentDoc(editor.getJSON() as EmailNodeJSON)
    : normalizeEmailDocumentDoc({ type: "doc", content: [] });

  const documentJson: EmailDocumentJSON = {
    version: 1,
    canvasStyle:
      template.body &&
      typeof template.body === "object" &&
      "canvasStyle" in template.body &&
      template.body.canvasStyle
        ? template.body.canvasStyle
        : {
            backgroundColor: "#ffffff",
            color: "#111827",
            maxWidth: "600px",
            padding: "32px",
            borderRadius: "12px",
          },
    doc: docJson,
  };

  return {
    name,
    subject,
    body: documentJson,
    isActive,
  };
}
