import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { useEmailStore } from "@/store/useEmailStore";
import type {
  EmailTemplate,
  EmailTemplateType,
  EmailDocumentJSON,
} from "@/types/email";
import {
  getEmailTemplates,
  getEmailTemplateById,
  getAvailableVariables,
  updateEmailTemplate,
  resetEmailTemplate,
  createEmailTemplate,
  deleteEmailTemplate,
  sendTestEmail,
  sendBatchEmail,
  getEmailLogs,
  resendEmailLog,
  getMailConnection,
  saveMailConnection,
  deleteMailConnection,
} from "@/api/emails";
import {
  validateEmailTemplateSave,
  validateSendTestEmail,
  validateSendBatchEmail,
  validateSmtpConfig,
  type SendTestEmailInput,
  type SendBatchEmailInput,
  type SmtpConfigInput,
} from "@/validators/email.validator";
import type { SmtpMailPayload } from "@/types/commerce";
import { createDefaultEmailDocument } from "@/utils/emailJsonCompiler";

function normalizeTemplateBody(body: unknown): EmailDocumentJSON {
  if (body && typeof body === "object" && "doc" in body && "version" in body) {
    return body as EmailDocumentJSON;
  }
  const defaultDoc = createDefaultEmailDocument();
  if (typeof body === "string" && body.trim()) {
    defaultDoc.doc.content = [
      {
        type: "paragraph",
        content: [{ type: "text", text: body.trim() }],
      },
    ];
  }
  return defaultDoc;
}

export function useEmailManagement() {
  const {
    setTemplates,
    setActiveType,
    setSelectedTemplateId,
    setLoadedTemplate,
    updateTemplateLocally,
    setVariables,
    setLogsAndAnalytics,
    setSmtpStatus,
    setLoading,
    setTemplateLoading,
    setSaving,
    setLogsLoading,
    setError,
    markClean,
  } = useEmailStore();

  const loadInitialData = useCallback(
    async (eventId: string) => {
      setLoading(true);
      setError(null);

      // 1. Fetch SMTP status in background
      getMailConnection(eventId)
        .then((mailRes) => {
          setSmtpStatus(mailRes);
        })
        .catch(() => {
          setSmtpStatus({ custom: false, defaultProvider: "smtp" });
        });

      // 2. Fetch templates, variables, and logs in parallel
      try {
        const [tplData, varData, logData] = await Promise.all([
          getEmailTemplates(eventId),
          getAvailableVariables(eventId),
          getEmailLogs(eventId),
        ]);

        const normalizedTemplates: EmailTemplate[] = (tplData || []).map(
          (tpl) => ({
            ...tpl,
            body: normalizeTemplateBody(tpl.body),
          }),
        );

        const standardTemplates = normalizedTemplates.filter(
          (t) => t.type !== "custom",
        );
        setTemplates(standardTemplates);
        setVariables(varData);

        if (Array.isArray(logData)) {
          setLogsAndAnalytics(logData, null);
        } else if (logData && typeof logData === "object" && "logs" in logData) {
          setLogsAndAnalytics(logData.logs, logData.analytics || null);
        } else {
          setLogsAndAnalytics([], null);
        }

        // Select initial template
        const match =
          standardTemplates.find((t) => t.type === "confirmation") ||
          standardTemplates[0];

        if (match) {
          setSelectedTemplateId(match.id);
          setActiveType(match.type);
          try {
            const full = await getEmailTemplateById(eventId, match.id);
            setLoadedTemplate({
              ...full,
              body: normalizeTemplateBody(full.body),
            });
          } catch {
            setLoadedTemplate(match);
          }
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err) || "Failed to load email templates";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      setLoading,
      setError,
      setSmtpStatus,
      setTemplates,
      setVariables,
      setLogsAndAnalytics,
      setSelectedTemplateId,
      setActiveType,
      setLoadedTemplate,
    ],
  );

  const selectTemplateType = useCallback(
    async (eventId: string, type: EmailTemplateType) => {
      setActiveType(type);
      const { templates, loadedTemplatesMap } = useEmailStore.getState();
      const matching = templates.filter((t) => t.type === type);

      if (matching.length > 0) {
        const target = matching[0]!;
        setSelectedTemplateId(target.id);

        if (!loadedTemplatesMap[target.id]?.body) {
          try {
            setTemplateLoading(true);
            const full = await getEmailTemplateById(eventId, target.id);
            setLoadedTemplate({
              ...full,
              body: normalizeTemplateBody(full.body),
            });
          } catch (err: unknown) {
            toast.error(getErrorMessage(err) || "Failed to load template");
          } finally {
            setTemplateLoading(false);
          }
        }
      } else {
        setSelectedTemplateId(null);
      }
    },
    [
      setActiveType,
      setSelectedTemplateId,
      setTemplateLoading,
      setLoadedTemplate,
    ],
  );

  const saveTemplate = useCallback(
    async (
      eventId: string,
      templateId: string,
      fields: Partial<EmailTemplate>,
    ) => {
      const { loadedTemplatesMap } = useEmailStore.getState();
      const existing = loadedTemplatesMap[templateId];

      const validation = validateEmailTemplateSave({
        name: fields.name || existing?.name || "Template",
        subject: fields.subject ?? existing?.subject ?? "",
        body: fields.body || existing?.body || createDefaultEmailDocument(),
        isActive: fields.isActive !== undefined ? fields.isActive : existing?.isActive,
      });

      if (!validation.success) {
        toast.error(validation.error);
        return false;
      }

      try {
        setSaving(true);
        const updated = await updateEmailTemplate(
          eventId,
          templateId,
          validation.data,
        );
        const normalized = {
          ...updated,
          body: normalizeTemplateBody(updated.body),
        };
        updateTemplateLocally(normalized.id, normalized);
        markClean();
        toast.success("Email template saved successfully!");
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to save template");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, updateTemplateLocally, markClean],
  );

  const toggleTemplateActive = useCallback(
    async (eventId: string, templateId: string) => {
      const { loadedTemplatesMap } = useEmailStore.getState();
      const current = loadedTemplatesMap[templateId];
      if (!current) return;

      const nextActive = !current.isActive;
      try {
        const updated = await updateEmailTemplate(eventId, templateId, {
          isActive: nextActive,
        });
        const normalized = {
          ...updated,
          body: normalizeTemplateBody(updated.body),
        };
        updateTemplateLocally(normalized.id, normalized);
        toast.success(
          `Template marked as ${normalized.isActive ? "active" : "inactive"}!`,
        );
      } catch (err: unknown) {
        toast.error(
          getErrorMessage(err) || "Failed to update template status",
        );
      }
    },
    [updateTemplateLocally],
  );

  const resetTemplate = useCallback(
    async (eventId: string, templateId: string) => {
      try {
        setSaving(true);
        const resetted = await resetEmailTemplate(eventId, templateId);
        const normalized = {
          ...resetted,
          body: normalizeTemplateBody(resetted.body),
        };
        updateTemplateLocally(normalized.id, normalized);
        markClean();
        toast.success("Template reset to system default email layout!");
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to reset template");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [setSaving, updateTemplateLocally, markClean],
  );

  const createTemplate = useCallback(
    async (eventId: string, type: EmailTemplateType, name: string) => {
      try {
        setSaving(true);
        const defaultDoc = createDefaultEmailDocument();
        const created = await createEmailTemplate(eventId, {
          name,
          type,
          subject: `${name} - Update`,
          body: defaultDoc,
          isActive: true,
        });
        const normalized = {
          ...created,
          body: normalizeTemplateBody(created.body),
        };
        const { templates } = useEmailStore.getState();
        setTemplates([...templates, normalized]);
        setSelectedTemplateId(normalized.id);
        setLoadedTemplate(normalized);
        toast.success("New template created!");
        return normalized;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to create template");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [
      setSaving,
      setTemplates,
      setSelectedTemplateId,
      setLoadedTemplate,
    ],
  );

  const deleteTemplate = useCallback(
    async (eventId: string, templateId: string) => {
      try {
        setSaving(true);
        await deleteEmailTemplate(eventId, templateId);
        const { templates } = useEmailStore.getState();
        const remaining = templates.filter((t) => t.id !== templateId);
        setTemplates(remaining);
        if (remaining.length > 0) {
          const next = remaining[0]!;
          setSelectedTemplateId(next.id);
          setActiveType(next.type);
        } else {
          setSelectedTemplateId(null);
        }
        markClean();
        toast.success("Template deleted successfully!");
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to delete template");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      setSaving,
      setTemplates,
      setSelectedTemplateId,
      setActiveType,
      markClean,
    ],
  );

  const refetchLogs = useCallback(
    async (eventId: string) => {
      try {
        setLogsLoading(true);
        const res = await getEmailLogs(eventId);
        if (Array.isArray(res)) {
          setLogsAndAnalytics(res, null);
        } else if (res && typeof res === "object" && "logs" in res) {
          setLogsAndAnalytics(res.logs, res.analytics || null);
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to refresh email logs");
      } finally {
        setLogsLoading(false);
      }
    },
    [setLogsLoading, setLogsAndAnalytics],
  );

  const sendTest = useCallback(
    async (eventId: string, input: SendTestEmailInput) => {
      const validation = validateSendTestEmail(input);
      if (!validation.success) {
        toast.error(validation.error);
        return false;
      }

      try {
        await sendTestEmail(eventId, validation.data);
        toast.success("Test email dispatched successfully!");
        await refetchLogs(eventId);
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to send test email");
        return false;
      }
    },
    [refetchLogs],
  );

  const sendBatch = useCallback(
    async (eventId: string, input: SendBatchEmailInput) => {
      const validation = validateSendBatchEmail(input);
      if (!validation.success) {
        toast.error(validation.error);
        return false;
      }

      try {
        const res = await sendBatchEmail(eventId, validation.data);
        toast.success(res.message);
        await refetchLogs(eventId);
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to send batch email");
        return false;
      }
    },
    [refetchLogs],
  );

  const resendLog = useCallback(
    async (eventId: string, logId: string) => {
      try {
        const updated = await resendEmailLog(eventId, logId);
        const { logs, analytics } = useEmailStore.getState();
        const updatedLogs = logs.map((l) => (l.id === updated.id ? updated : l));
        setLogsAndAnalytics(updatedLogs, analytics);
        toast.success(
          `Email resent successfully to ${updated.recipientEmail}!`,
        );
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to resend email");
        throw err;
      }
    },
    [setLogsAndAnalytics],
  );

  const saveSmtp = useCallback(
    async (eventId: string, input: SmtpConfigInput) => {
      const validation = validateSmtpConfig(input);
      if (!validation.success) {
        toast.error(validation.error);
        return false;
      }

      try {
        await saveMailConnection(eventId, validation.data as SmtpMailPayload);
        const updatedStatus = await getMailConnection(eventId);
        setSmtpStatus(updatedStatus);
        toast.success("Custom SMTP settings saved successfully!");
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to save SMTP settings.");
        return false;
      }
    },
    [setSmtpStatus],
  );

  const removeSmtp = useCallback(
    async (eventId: string) => {
      try {
        await deleteMailConnection(eventId);
        setSmtpStatus({ custom: false, defaultProvider: "smtp" });
        toast.success("Custom SMTP removed. Reset to default mailer.");
        return true;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to remove custom SMTP.");
        return false;
      }
    },
    [setSmtpStatus],
  );

  return {
    loadInitialData,
    selectTemplateType,
    saveTemplate,
    toggleTemplateActive,
    resetTemplate,
    createTemplate,
    deleteTemplate,
    sendTest,
    sendBatch,
    resendLog,
    saveSmtp,
    removeSmtp,
    refetchLogs,
  };
}
