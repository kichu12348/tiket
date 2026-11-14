"use client";
import { getErrorMessage } from "@/lib/errors";

import React, { useState, useEffect, useCallback } from "react";
import { useEventStore } from "@/store/useEventStore";
import type {
  EmailTemplate,
  EmailTemplateType,
  AvailableVariables,
  EmailLog,
  EmailAnalytics,
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
  resendEmailLog,
} from "@/api/emails";
import { getMailConnection } from "@/api/commerce";
import { toast } from "sonner";
import { Power } from "lucide-react";
import styles from "./EmailsPage.module.css";

import TemplateTypeSelector from "./components/TemplateTypeSelector";
import EmailPaperCanvas from "./components/EmailPaperCanvas";
import VariablePicker from "./components/VariablePicker";
import LivePreviewPane from "./components/LivePreviewPane";
import SendTestModal from "./components/SendTestModal";
import SendBatchModal from "./components/SendBatchModal";
import MailConnectionModal from "./components/MailConnectionModal";
import EmailLogsTable from "./components/EmailLogsTable";
import {
  EmailPageSkeleton,
  EmailEditorSkeleton,
} from "./components/EmailSkeletonLoader";

export default function EditEmailsPage() {
  const { event } = useEventStore();
  const [activeType, setActiveType] =
    useState<EmailTemplateType>("confirmation");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadedTemplatesMap, setLoadedTemplatesMap] = useState<
    Record<string, EmailTemplate>
  >({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [variables, setVariables] = useState<AvailableVariables | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isCustomSmtp, setIsCustomSmtp] = useState(false);

  // 1. Initial load: Fetch template types list, variables, logs & mail connection
  const loadInitialData = useCallback(async (eventId: string) => {
    getMailConnection(eventId)
      .then((mailRes) => {
        setIsCustomSmtp(Boolean(mailRes?.custom));
      })
      .catch(() => {
        setIsCustomSmtp(false);
      });

    return Promise.all([
      getEmailTemplates(eventId),
      getAvailableVariables(eventId),
      getEmailLogs(eventId),
    ])
      .then(async ([tplData, varData, logData]) => {
        setTemplates(tplData);
        setVariables(varData);
        if (Array.isArray(logData)) {
          setLogs(logData);
          setAnalytics(null);
        } else if (logData && typeof logData === "object" && "logs" in logData) {
          setLogs(logData.logs);
          setAnalytics(logData.analytics || null);
        } else {
          setLogs([]);
          setAnalytics(null);
        }

        // Select first template matching activeType
        const match =
          tplData.find((t) => t.type === "confirmation") || tplData[0];
        if (match) {
          setSelectedTemplateId(match.id);
          try {
            const full = await getEmailTemplateById(eventId, match.id);
            setLoadedTemplatesMap((prev) => ({
              ...prev,
              [full.id]: full,
            }));
          } catch {
            setLoadedTemplatesMap((prev) => ({
              ...prev,
              [match.id]: match,
            }));
          }
        }
      })
      .catch((err: unknown) => {
        toast.error(getErrorMessage(err) || "Failed to load email templates");
      })
      .finally(() => {
        setIsInitialLoading(false);
      });
  }, []);

  useEffect(() => {
    if (event?.id) {
      loadInitialData(event.id);
    }
  }, [event?.id, loadInitialData]);

  // When active category changes, fetch full template on demand and select it
  const handleSelectType = async (type: EmailTemplateType) => {
    setActiveType(type);
    const matching = templates.filter((t) => t.type === type);
    if (matching.length > 0) {
      const target = matching[0];
      setSelectedTemplateId(target.id);
      if (event?.id) {
        try {
          setIsTemplateLoading(true);
          const full = await getEmailTemplateById(event.id, target.id);
          setLoadedTemplatesMap((prev) => ({
            ...prev,
            [full.id]: full,
          }));
        } catch (err: unknown) {
          toast.error(getErrorMessage(err) || "Failed to load template");
        } finally {
          setIsTemplateLoading(false);
        }
      }
    } else {
      setSelectedTemplateId(null);
    }
  };

  // When selecting a custom template tab
  const handleSelectCustomTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (event?.id) {
      try {
        setIsTemplateLoading(true);
        const full = await getEmailTemplateById(event.id, templateId);
        setLoadedTemplatesMap((prev) => ({
          ...prev,
          [full.id]: full,
        }));
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || "Failed to load template");
      } finally {
        setIsTemplateLoading(false);
      }
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle template active status with immediate persistence
  const handleToggleActive = async () => {
    if (!event?.id || !selectedTemplateId || !currentTemplate) return;
    try {
      const nextActive = !currentTemplate.isActive;
      const updated = await updateEmailTemplate(event.id, selectedTemplateId, {
        isActive: nextActive,
      });
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setLoadedTemplatesMap((prev) => ({
        ...prev,
        [updated.id]: updated,
      }));
      toast.success(
        `Template marked as ${updated.isActive ? "active" : "inactive"}!`,
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to update template status");
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
      setResetKey((k) => k + 1);
      toast.success("Template reset to system default email layout!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to reset template");
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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to create custom template");
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
        handleSelectCustomTemplate(remainingCustom[0].id);
      } else {
        handleSelectType("confirmation");
      }

      toast.success("Custom template deleted!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete template");
    }
  };

  // Variable insertion into active subject input or ProseMirror canvas
  const handleInsertVariable = (variableKey: string) => {
    const activeEl = document.activeElement as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (
      activeEl &&
      (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
    ) {
      const start = activeEl.selectionStart ?? activeEl.value.length;
      const end = activeEl.selectionEnd ?? activeEl.value.length;
      const val = activeEl.value;
      const before = val.slice(0, start);
      const after = val.slice(end);
      const spaceBefore = before.length > 0 && !before.endsWith(" ") ? " " : "";
      const spaceAfter = after.length > 0 && !after.startsWith(" ") ? " " : "";
      const nextVal = `${before}${spaceBefore}${variableKey}${spaceAfter}${after}`;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(activeEl, nextVal);
      } else {
        activeEl.value = nextVal;
      }
      activeEl.dispatchEvent(new Event("input", { bubbles: true }));
      activeEl.dispatchEvent(new Event("change", { bubbles: true }));

      const nextPos =
        start + spaceBefore.length + variableKey.length + spaceAfter.length;
      activeEl.setSelectionRange(nextPos, nextPos);
      activeEl.focus();
      return;
    }

    const proseMirrorEl = document.querySelector(
      ".ProseMirror",
    ) as HTMLElement | null;
    if (proseMirrorEl) {
      proseMirrorEl.focus();
      document.execCommand("insertText", false, ` ${variableKey} `);
      return;
    }

    const subjectInput = document.querySelector(
      "input[placeholder*='Invited to'], input[class*='subjectBoxInput']",
    ) as HTMLInputElement | null;
    if (subjectInput) {
      const val = subjectInput.value;
      const nextVal = val ? `${val} ${variableKey}` : variableKey;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(subjectInput, nextVal);
      } else {
        subjectInput.value = nextVal;
      }
      subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
      subjectInput.dispatchEvent(new Event("change", { bubbles: true }));
      subjectInput.focus();
    }
  };

  // Send Test email
  const handleSendTest = async (
    recipientEmail: string,
    recipientName: string,
  ) => {
    if (!event?.id || !currentTemplate) return;
    try {
      await sendTestEmail(event.id, {
        recipientEmail,
        recipientName: recipientName || undefined,
        subject: currentTemplate.subject || "",
        body: currentTemplate.body || "",
        templateId: currentTemplate.id,
      });

      toast.success("Test email dispatched successfully!");
      // Reload logs to reflect freshly logged email
      setIsLogsLoading(true);
      const res = await getEmailLogs(event.id);
      if (Array.isArray(res)) {
        setLogs(res);
      } else if (res && typeof res === "object" && "logs" in res) {
        setLogs(res.logs);
        setAnalytics(res.analytics || null);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to send test email");
    } finally {
      setIsLogsLoading(false);
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
      // Reload logs to reflect freshly sent batch emails
      setIsLogsLoading(true);
      const updatedRes = await getEmailLogs(event.id);
      if (Array.isArray(updatedRes)) {
        setLogs(updatedRes);
      } else if (updatedRes && typeof updatedRes === "object" && "logs" in updatedRes) {
        setLogs(updatedRes.logs);
        setAnalytics(updatedRes.analytics || null);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to send batch email");
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Resend single email log
  const handleResendEmail = async (logId: string) => {
    if (!event?.id) return;
    try {
      const updated = await resendEmailLog(event.id, logId);
      setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast.success(
        `Email resent successfully to ${updated.recipientEmail}!`,
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to resend email");
      throw err;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Event Email Management</h1>
            <p className={styles.subtitle}>
              Design white-theme email templates and send automated booking
              confirmations, check-ins, or targeted broadcasts.
            </p>
          </div>
          <button
            type="button"
            className={styles.smtpTriggerBtn}
            onClick={() => setIsMailModalOpen(true)}
            aria-label="Configure Custom SMTP Connection"
          >
            <span
              className={styles.statusDot}
              data-status={isCustomSmtp ? "connected" : "default"}
            />
            <span className={styles.smtpBtnLabel}>Custom SMTP</span>
            <span
              className={styles.statusBadge}
              data-status={isCustomSmtp ? "connected" : "default"}
            >
              {isCustomSmtp ? "Connected" : "Default Mailer"}
            </span>
          </button>
        </div>
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
                    onClick={() => handleSelectCustomTemplate(ct.id)}
                  >
                    {ct.name}
                  </button>
                ))}
            </div>
          )}

          {currentTemplate && (
            <div className={styles.templateMetaBar}>
              <div className={styles.templateMetaInfo}>
                <h2 className={styles.currentTemplateName}>
                  {currentTemplate.name}
                </h2>
              </div>
              <button
                type="button"
                className={styles.statusToggleBtn}
                data-active={currentTemplate.isActive}
                onClick={handleToggleActive}
                title={
                  currentTemplate.isActive
                    ? "Template is active (Click to deactivate)"
                    : "Template is inactive (Click to activate)"
                }
              >
                <Power size={14} />
                <span>{currentTemplate.isActive ? "Active" : "Inactive"}</span>
              </button>
            </div>
          )}

          {isTemplateLoading ? (
            <EmailEditorSkeleton />
          ) : currentTemplate ? (
            <>
              <EmailPaperCanvas
                key={`${currentTemplate.id}-${currentTemplate.updatedAt}-${resetKey}`}
                template={currentTemplate}
                variables={variables}
                onSave={handleSaveTemplate}
                onReset={handleResetTemplate}
                onDelete={handleDeleteCustom}
                onOpenSendTest={() => setIsTestModalOpen(true)}
                onOpenSendBatch={() => setIsBatchModalOpen(true)}
                isSaving={isSaving}
              />

              <div className={styles.workspaceGrid}>
                <div className={styles.leftCol}>
                  <VariablePicker
                    variables={variables}
                    onInsertVariable={handleInsertVariable}
                  />
                </div>
                <div className={styles.rightCol}>
                  <LivePreviewPane
                    subject={currentTemplate.subject || ""}
                    body={currentTemplate.body || ""}
                    variables={variables}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className={styles.loadingCard}>
              <p className={styles.loadingText}>
                No template found for this section.
              </p>
            </div>
          )}

          <div className={styles.logsSection}>
            <EmailLogsTable
              logs={logs}
              analytics={analytics}
              isLoading={isLogsLoading}
              onResend={handleResendEmail}
              eventId={event?.id}
            />
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

          {event?.id && (
            <MailConnectionModal
              isOpen={isMailModalOpen}
              onClose={() => setIsMailModalOpen(false)}
              eventId={event.id}
              isCustom={isCustomSmtp}
              onStatusChange={(custom) => setIsCustomSmtp(custom)}
            />
          )}
        </>
      )}
    </div>
  );
}
