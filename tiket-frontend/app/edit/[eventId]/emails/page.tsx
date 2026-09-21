"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useEventStore } from "@/store/useEventStore";
import type {
  EmailTemplate,
  EmailTemplateType,
  AvailableVariables,
  EmailLog,
} from "@/types/email";
import {
  getEmailTemplates,
  getEmailTemplateById,
  getAvailableVariables,
  updateEmailTemplate,
  resetEmailTemplate,
  deleteCustomEmailTemplate,
  createCustomEmailTemplate,
  sendTestEmail,
  sendBatchEmail,
  getEmailLogs,
} from "@/api/emails";
import { toast } from "sonner";
import styles from "./EmailsPage.module.css";

import TemplateTypeSelector from "./components/TemplateTypeSelector";
import EmailPaperCanvas from "./components/EmailPaperCanvas";
import SendTestModal from "./components/SendTestModal";
import SendBatchModal from "./components/SendBatchModal";
import EmailLogsTable from "./components/EmailLogsTable";
import {
  EmailPageSkeleton,
  EmailEditorSkeleton,
} from "./components/EmailSkeletonLoader";

export default function EditEmailsPage() {
  const { event } = useEventStore();
  const [activeType, setActiveType] = useState<EmailTemplateType>("confirmation");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadedTemplatesMap, setLoadedTemplatesMap] = useState<
    Record<string, EmailTemplate>
  >({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variables, setVariables] = useState<AvailableVariables | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogsLoading] = useState(false);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // 1. Initial load: Fetch template types list, variables & logs
  const loadInitialData = async (eventId: string) => {
    try {
      setIsInitialLoading(true);
      const [tplData, varData, logData] = await Promise.all([
        getEmailTemplates(eventId),
        getAvailableVariables(eventId),
        getEmailLogs(eventId),
      ]);

      setTemplates(tplData);
      setVariables(varData);
      setLogs(logData);

      // Select first template matching activeType
      const match = tplData.find((t) => t.type === activeType) || tplData[0];
      if (match) {
        setSelectedTemplateId(match.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to load email templates");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (event?.id) {
      loadInitialData(event.id);
    }
  }, [event?.id]);

  // 2. Lazy loading template content on demand when selected
  const fetchTemplateOnDemand = useCallback(
    async (eventId: string, templateId: string) => {
      if (loadedTemplatesMap[templateId]) return;

      try {
        setIsTemplateLoading(true);
        const fetched = await getEmailTemplateById(eventId, templateId);
        setLoadedTemplatesMap((prev) => ({
          ...prev,
          [templateId]: fetched,
        }));
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to load email template");
      } finally {
        setIsTemplateLoading(false);
      }
    },
    [loadedTemplatesMap],
  );

  useEffect(() => {
    if (event?.id && selectedTemplateId) {
      if (!loadedTemplatesMap[selectedTemplateId]) {
        fetchTemplateOnDemand(event.id, selectedTemplateId);
      }
    }
  }, [event?.id, selectedTemplateId, loadedTemplatesMap, fetchTemplateOnDemand]);

  // When active category changes, select the first matching template
  const handleSelectType = (type: EmailTemplateType) => {
    setActiveType(type);
    const matching = templates.filter((t) => t.type === type);
    if (matching.length > 0) {
      setSelectedTemplateId(matching[0].id);
    } else {
      setSelectedTemplateId(null);
    }
  };

  const currentTemplate = selectedTemplateId
    ? loadedTemplatesMap[selectedTemplateId] || null
    : null;

  // Save template updates
  const handleSaveTemplate = async (updatedFields: Partial<EmailTemplate>) => {
    if (!event?.id || !selectedTemplateId) return;
    try {
      setIsSaving(true);
      const updated = await updateEmailTemplate(
        event.id,
        selectedTemplateId,
        updatedFields,
      );
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setLoadedTemplatesMap((prev) => ({
        ...prev,
        [updated.id]: updated,
      }));
      toast.success("Email template saved successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset template to system defaults
  const handleResetTemplate = async () => {
    if (!event?.id || !selectedTemplateId) return;
    try {
      setIsSaving(true);
      const reseted = await resetEmailTemplate(event.id, selectedTemplateId);
      setTemplates((prev) =>
        prev.map((t) => (t.id === reseted.id ? reseted : t)),
      );
      setLoadedTemplatesMap((prev) => ({
        ...prev,
        [reseted.id]: reseted,
      }));
      toast.success("Template reset to system default email layout!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reset template");
    } finally {
      setIsSaving(false);
    }
  };

  // Create Custom Template
  const handleCreateCustom = async () => {
    if (!event?.id) return;
    try {
      const newCustom = await createCustomEmailTemplate(event.id, {
        name: "New Announcement Email",
        subject: "Special Announcement for {{event.title}}",
        body: `<div style="font-family: 'Inter', Arial, sans-serif; background-color: #ffffff; color: #111827; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;"><h2 style="color: #111827; margin-top: 0;">Special Announcement</h2><p style="color: #4b5563;">Hi {{attendee.name}},</p><p style="color: #4b5563;">We have an exciting update for {{event.title}}!</p></div>`,
      });

      setTemplates((prev) => [...prev, newCustom]);
      setLoadedTemplatesMap((prev) => ({
        ...prev,
        [newCustom.id]: newCustom,
      }));
      setActiveType("custom");
      setSelectedTemplateId(newCustom.id);
      toast.success("New custom template created!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create custom template");
    }
  };

  // Delete Custom Template
  const handleDeleteCustom = async () => {
    if (
      !event?.id ||
      !selectedTemplateId ||
      !currentTemplate ||
      currentTemplate.type !== "custom"
    )
      return;
    try {
      await deleteCustomEmailTemplate(event.id, selectedTemplateId);
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
      setLoadedTemplatesMap((prev) => {
        const next = { ...prev };
        delete next[selectedTemplateId];
        return next;
      });

      const remainingCustom = templates.filter(
        (t) => t.type === "custom" && t.id !== selectedTemplateId,
      );
      if (remainingCustom.length > 0) {
        setSelectedTemplateId(remainingCustom[0].id);
      } else {
        handleSelectType("confirmation");
      }

      toast.success("Custom template deleted!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete template");
    }
  };

  // Send Test email
  const handleSendTest = async (recipientEmail: string, recipientName: string) => {
    if (!event?.id || !currentTemplate) return;
    try {
      const res = await sendTestEmail(event.id, {
        recipientEmail,
        recipientName: recipientName || undefined,
        subject: currentTemplate.subject || "",
        body: currentTemplate.body || "",
        templateId: currentTemplate.id,
      });

      toast.success("Test email dispatched successfully!");
      if (res.log) {
        setLogs((prev) => [res.log, ...prev]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send test email");
    }
  };

  // Send Batch email
  const handleSendBatch = async (
    targetGroup: "all" | "checked_in" | "not_checked_in" | "custom",
    customEmails?: string[],
  ) => {
    if (!event?.id || !currentTemplate) return;
    try {
      const res = await sendBatchEmail(event.id, {
        targetGroup,
        customEmails,
        subject: currentTemplate.subject || "",
        body: currentTemplate.body || "",
        templateId: currentTemplate.id,
      });

      toast.success(res.message);
      // Reload logs
      const updatedLogs = await getEmailLogs(event.id);
      setLogs(updatedLogs);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send batch email");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Event Email Management</h1>
        <p className={styles.subtitle}>
          Design white-theme email templates and send automated booking confirmations, check-ins, or targeted broadcasts.
        </p>
      </div>

      {isInitialLoading ? (
        <EmailPageSkeleton />
      ) : (
        <>
          <TemplateTypeSelector
            activeType={activeType}
            onSelectType={handleSelectType}
            templates={templates}
            onCreateCustom={handleCreateCustom}
          />

          {/* Sub-selector if multiple custom templates exist under 'custom' type */}
          {activeType === "custom" && (
            <div className={`${styles.customSubBar} scrollbar`}>
              {templates
                .filter((t) => t.type === "custom")
                .map((ct) => (
                  <button
                    key={ct.id}
                    className={styles.subTab}
                    data-active={ct.id === selectedTemplateId}
                    onClick={() => setSelectedTemplateId(ct.id)}
                  >
                    {ct.name}
                  </button>
                ))}
            </div>
          )}

          {isTemplateLoading ? (
            <EmailEditorSkeleton />
          ) : currentTemplate ? (
            <EmailPaperCanvas
              key={currentTemplate.id}
              template={currentTemplate}
              variables={variables}
              onSave={handleSaveTemplate}
              onReset={handleResetTemplate}
              onDelete={handleDeleteCustom}
              onOpenSendTest={() => setIsTestModalOpen(true)}
              onOpenSendBatch={() => setIsBatchModalOpen(true)}
              isSaving={isSaving}
            />
          ) : (
            <div className={styles.loadingCard}>
              <p className={styles.loadingText}>No template found for this section.</p>
            </div>
          )}

          <div className={styles.logsSection}>
            <EmailLogsTable logs={logs} isLoading={isLogsLoading} />
          </div>

          {currentTemplate && (
            <>
              <SendTestModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                onSendTest={handleSendTest}
                templateName={currentTemplate.name}
              />

              <SendBatchModal
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                onSendBatch={handleSendBatch}
                templateName={currentTemplate.name}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
