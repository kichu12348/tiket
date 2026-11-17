import type {
  AvailableVariables,
  EmailTemplate,
  EmailDocumentJSON,
  EmailNodeJSON,
  EmailDocumentNode,
  EmailVariableItem,
} from "@/types/email";
import { EmailModelSerializer } from "@/lib/emailModelSerializer";
import {
  compileEmailJsonToHtml,
  normalizeEmailDocumentDoc,
} from "@/utils/emailJsonCompiler";

export function getAllVariables(
  variables: AvailableVariables | null,
): EmailVariableItem[] {
  if (!variables) return [];
  return [
    ...(variables.eventVariables || []),
    ...(variables.attendeeVariables || []),
    ...(variables.ticketVariables || []),
    ...(variables.formVariables || []),
  ];
}

export function buildSampleValues(
  allVars: EmailVariableItem[],
): Record<string, string> {
  const sampleValues: Record<string, string> = {};
  allVars.forEach((v) => {
    sampleValues[v.key] = v.sample;
    const stripped = v.key.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
    sampleValues[stripped] = v.sample;
  });
  return sampleValues;
}

export function getQrCodeUrl(sampleValues: Record<string, string>): string {
  return (
    sampleValues["{{ticket.qrCodeUrl}}"] ||
    sampleValues["ticket.qrCodeUrl"] ||
    "https://quickchart.io/qr?text=TKT-884920-XYZ"
  );
}

export function renderInterpolated(
  templateStr: string,
  sampleValues: Record<string, string>,
  qrUrl: string,
  isBody = false,
): string {
  if (!templateStr) return "";

  let result = templateStr.replace(
    /src=["']\{\{\s*([^}]+?)\s*\}\}["']/g,
    (_match, key) => {
      const trimmed = key.trim();
      const fullKey = `{{${trimmed}}}`;
      const val = sampleValues[fullKey] || sampleValues[trimmed];
      return `src="${val || qrUrl}"`;
    },
  );

  result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (trimmedKey === "ticket.qrCodeUrl") {
      if (isBody) {
        return `<img src="${qrUrl}" alt="Ticket QR Code" width="160" height="160" style="display:block;margin:12px auto;border-radius:8px;border:1px solid #e5e7eb;" />`;
      }
      return qrUrl;
    }
    const fullKey = `{{${trimmedKey}}}`;
    return sampleValues[fullKey] || sampleValues[trimmedKey] || match;
  });

  return result;
}

export interface PreviewDataParams {
  template: EmailTemplate;
  subject: string;
  editorJson: EmailNodeJSON;
  variables: AvailableVariables | null;
}

export interface PreviewDataResult {
  allVars: EmailVariableItem[];
  previewSubject: string;
  previewBodyHtml: string;
  compiledRawHtml: string;
  currentDocModel: EmailDocumentJSON;
}

export function computePreviewData({
  template,
  subject,
  editorJson,
  variables,
}: PreviewDataParams): PreviewDataResult {
  const allVars = getAllVariables(variables);
  const sampleValues = buildSampleValues(allVars);
  const qrUrl = getQrCodeUrl(sampleValues);

  const currentDocJson = normalizeEmailDocumentDoc(editorJson);
  const currentDocModel: EmailDocumentJSON = {
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
    doc: currentDocJson,
  };

  const previewSubject =
    renderInterpolated(subject, sampleValues, qrUrl, false) || "(No Subject)";
  const compiledRawHtml = compileEmailJsonToHtml(currentDocModel);
  const previewBodyHtml =
    compileEmailJsonToHtml(currentDocModel, sampleValues) ||
    renderInterpolated(
      EmailModelSerializer.serializeJsonToHtml(
        editorJson as unknown as EmailDocumentNode,
      ),
      sampleValues,
      qrUrl,
      true,
    ) ||
    "<p style='color:#9ca3af;'>No content written yet...</p>";

  return {
    allVars,
    previewSubject,
    previewBodyHtml,
    compiledRawHtml,
    currentDocModel,
  };
}
