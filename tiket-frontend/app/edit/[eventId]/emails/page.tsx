"use client";

import React, { useState, useEffect } from "react";
import { useEventStore } from "@/store/useEventStore";
import { useEmailStore } from "@/store/useEmailStore";
import { useEmailManagement } from "@/hooks/useEmailManagement";
import type { EmailTemplateType, EmailTemplate } from "@/types/email";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Power } from "lucide-react";
import styles from "./EmailsPage.module.css";

import TemplateTypeSelector from "./components/TemplateTypeSelector";
import EmailPaperCanvas from "./components/EmailPaperCanvas";
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
  const {
    templates,
    activeType,
    selectedTemplateId,
    loadedTemplatesMap,
    variables,
    logs,
    analytics,
    smtpStatus,
    activeTab,
    isLoading,
    isTemplateLoading,
    isSaving,
    isLogsLoading,
    setActiveTab,
  } = useEmailStore();

  const {
    loadInitialData,
    selectTemplateType,
    saveTemplate,
    toggleTemplateActive,
    resetTemplate,
    sendTest,
    sendBatch,
    resendLog,
  } = useEmailManagement();

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);

  useEffect(() => {
    if (event?.id) {
      loadInitialData(event.id);
    }
  }, [event?.id, loadInitialData]);

  const currentTemplate: EmailTemplate | null = selectedTemplateId
    ? loadedTemplatesMap[selectedTemplateId] || null
    : null;

  const handleSelectType = (type: EmailTemplateType) => {
    if (event?.id) {
      selectTemplateType(event.id, type);
    }
  };

  const handleSaveTemplate = async (updatedFields: Partial<EmailTemplate>) => {
    if (!event?.id || !selectedTemplateId) return;
    await saveTemplate(event.id, selectedTemplateId, updatedFields);
  };

  const handleToggleActive = async () => {
    if (!event?.id || !selectedTemplateId) return;
    await toggleTemplateActive(event.id, selectedTemplateId);
  };

  const handleResetTemplate = async () => {
    if (!event?.id || !selectedTemplateId) return;
    await resetTemplate(event.id, selectedTemplateId);
  };

  const handleSendTest = async (
    recipientEmail: string,
    recipientName: string,
  ) => {
    if (!event?.id || !currentTemplate) return;
    await sendTest(event.id, {
      recipientEmail,
      recipientName: recipientName || undefined,
      subject: currentTemplate.subject || "",
      body: currentTemplate.body || "",
      templateId: currentTemplate.id,
    });
  };

  const handleSendBatch = async (
    targetGroup: "all" | "checked_in" | "not_checked_in" | "custom",
    customEmails?: string[],
  ) => {
    if (!event?.id || !currentTemplate) return;
    await sendBatch(event.id, {
      targetGroup,
      customEmails,
      subject: currentTemplate.subject || "",
      body: currentTemplate.body || "",
      templateId: currentTemplate.id,
    });
  };

  const handleResendEmail = async (logId: string) => {
    if (!event?.id) return;
    await resendLog(event.id, logId);
  };

  const isCustomSmtp = Boolean(smtpStatus?.custom);

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

      {isLoading ? (
        <EmailPageSkeleton />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "editor" | "logs")}
          className={styles.tabsRoot}
        >
          <TabsList className={styles.tabsList}>
            <TabsTrigger
              value="editor"
              className={styles.tabTrigger}
              onClick={() => setActiveTab("editor")}
            >
              Templates &amp; Editor
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className={styles.tabTrigger}
              onClick={() => setActiveTab("logs")}
            >
              Delivery Logs &amp; Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className={styles.tabContent}>
            <TemplateTypeSelector
              activeType={activeType}
              onSelectType={handleSelectType}
              templates={templates}
            />

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
                  <span>
                    {currentTemplate.isActive ? "Active" : "Inactive"}
                  </span>
                </button>
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
                onOpenSendTest={() => setIsTestModalOpen(true)}
                onOpenSendBatch={() => setIsBatchModalOpen(true)}
                isSaving={isSaving}
                eventId={event?.id}
              />
            ) : (
              <div className={styles.loadingCard}>
                <p className={styles.loadingText}>
                  No template found for this section.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className={styles.tabContent}>
            <div className={styles.logsSection}>
              <EmailLogsTable
                logs={logs}
                analytics={analytics}
                isLoading={isLogsLoading}
                onResend={handleResendEmail}
                eventId={event?.id}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

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
          initialConfig={smtpStatus?.config}
          onStatusChange={() => {
            if (event?.id) loadInitialData(event.id);
          }}
        />
      )}
    </div>
  );
}
