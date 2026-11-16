import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { useEmailStore } from "@/store/useEmailStore";
import {
  saveMailConnection,
  testMailConnection,
  deleteMailConnection,
  getMailConnection,
} from "@/api/emails";
import {
  validateSmtpConfig,
  type SmtpConfigInput,
} from "@/validators/email.validator";
import type { SmtpMailPayload } from "@/types/commerce";
import type { SmtpConfigSummary } from "@/types/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UseMailConnectionOptions {
  eventId: string;
  initialConfig?: SmtpConfigSummary | null;
  onStatusChange?: (isCustom: boolean) => void;
  onClose: () => void;
}

export function useMailConnection({
  eventId,
  initialConfig,
  onStatusChange,
  onClose,
}: UseMailConnectionOptions) {
  const setSmtpStatus = useEmailStore((state) => state.setSmtpStatus);

  const [host, setHost] = useState(initialConfig?.host || "");
  const [port, setPort] = useState(String(initialConfig?.port || 587));
  const [username, setUsername] = useState(initialConfig?.username || "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(initialConfig?.fromName || "");
  const [fromEmail, setFromEmail] = useState(initialConfig?.fromEmail || "");
  const [secure, setSecure] = useState(Boolean(initialConfig?.secure));
  const [testRecipient, setTestRecipient] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSave = async () => {
    const parsedPort = parseInt(port, 10);
    const hasPassword = Boolean(initialConfig?.hasPassword);

    const payload: SmtpConfigInput = {
      host: host.trim(),
      port: parsedPort,
      secure,
      username: username.trim(),
      password: password.trim() ? password.trim() : undefined,
      hasPassword,
      fromEmail: fromEmail.trim(),
      fromName: fromName.trim() || undefined,
    };

    const validation = validateSmtpConfig(payload);
    if (!validation.success) {
      toast.error(validation.error);
      return;
    }

    try {
      setIsSaving(true);
      const savePayload: SmtpMailPayload = {
        host: validation.data.host,
        port: validation.data.port,
        secure: validation.data.secure,
        username: validation.data.username,
        password: validation.data.password,
        fromEmail: validation.data.fromEmail,
        fromName: validation.data.fromName,
      };

      await saveMailConnection(eventId, savePayload);

      try {
        const updatedStatus = await getMailConnection(eventId);
        setSmtpStatus(updatedStatus);
      } catch {
        setSmtpStatus({
          custom: true,
          defaultProvider: "smtp",
          config: {
            host: validation.data.host,
            port: validation.data.port,
            secure: validation.data.secure,
            username: validation.data.username,
            fromEmail: validation.data.fromEmail,
            fromName: validation.data.fromName,
            hasPassword: Boolean(
              validation.data.password || initialConfig?.hasPassword,
            ),
          },
        });
      }

      toast.success("Custom SMTP settings saved successfully!");
      onStatusChange?.(true);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to save SMTP settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    const recipient = testRecipient.trim() || fromEmail.trim();
    if (!recipient) {
      toast.error("Please provide a test recipient email address.");
      return;
    }

    if (!EMAIL_REGEX.test(recipient)) {
      toast.error("Please provide a valid test recipient email address.");
      return;
    }

    try {
      setIsTesting(true);
      await testMailConnection(eventId, recipient);
      toast.success(`Test email sent successfully to ${recipient}!`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to send test email.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      await deleteMailConnection(eventId);
      setSmtpStatus({ custom: false, defaultProvider: "smtp" });
      toast.success("Custom SMTP removed. Reset to default mailer.");
      onStatusChange?.(false);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to remove custom SMTP.");
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    host,
    setHost,
    port,
    setPort,
    username,
    setUsername,
    password,
    setPassword,
    fromName,
    setFromName,
    fromEmail,
    setFromEmail,
    secure,
    setSecure,
    testRecipient,
    setTestRecipient,
    isSaving,
    isTesting,
    isRemoving,
    handleSave,
    handleSendTest,
    handleRemove,
  };
}
