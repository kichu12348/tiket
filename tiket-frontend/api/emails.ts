import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import type {
  EmailTemplate,
  AvailableVariables,
  SendTestEmailPayload,
  SendBatchEmailPayload,
  EmailLog,
} from "@/types/email";

export const getEmailTemplates = async (eventId: string): Promise<EmailTemplate[]> => {
  const response = await api.get(API_ENDPOINTS.EMAILS.TEMPLATES(eventId));
  return response.data;
};

export const getEmailTemplateById = async (
  eventId: string,
  templateId: string,
): Promise<EmailTemplate> => {
  const response = await api.get(
    API_ENDPOINTS.EMAILS.TEMPLATE_BY_ID(eventId, templateId),
  );
  return response.data;
};


export const createEmailTemplate = async (
  eventId: string,
  payload: Partial<EmailTemplate>,
): Promise<EmailTemplate> => {
  const response = await api.post(API_ENDPOINTS.EMAILS.TEMPLATES(eventId), payload);
  return response.data;
};
export const createCustomEmailTemplate = createEmailTemplate;

export const updateEmailTemplate = async (
  eventId: string,
  templateId: string,
  payload: Partial<EmailTemplate>,
): Promise<EmailTemplate> => {
  const response = await api.put(
    API_ENDPOINTS.EMAILS.TEMPLATE_BY_ID(eventId, templateId),
    payload,
  );
  return response.data;
};

export const deleteEmailTemplate = async (
  eventId: string,
  templateId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.EMAILS.TEMPLATE_BY_ID(eventId, templateId),
  );
  return response.data;
};
export const deleteCustomEmailTemplate = deleteEmailTemplate;

export const resetEmailTemplate = async (
  eventId: string,
  templateId: string,
): Promise<EmailTemplate> => {
  const response = await api.post(
    API_ENDPOINTS.EMAILS.RESET_TEMPLATE(eventId, templateId),
  );
  return response.data;
};

export const getAvailableVariables = async (
  eventId: string,
): Promise<AvailableVariables> => {
  const response = await api.get(API_ENDPOINTS.EMAILS.VARIABLES(eventId));
  return response.data;
};

export const sendTestEmail = async (
  eventId: string,
  payload: SendTestEmailPayload,
): Promise<{ message: string; log: EmailLog }> => {
  const response = await api.post(API_ENDPOINTS.EMAILS.SEND_TEST(eventId), payload);
  return response.data;
};

export const sendBatchEmail = async (
  eventId: string,
  payload: SendBatchEmailPayload,
): Promise<{ message: string; sentCount: number }> => {
  const response = await api.post(API_ENDPOINTS.EMAILS.SEND_BATCH(eventId), payload);
  return response.data;
};

export const getEmailLogs = async (eventId: string): Promise<EmailLog[]> => {
  const response = await api.get(API_ENDPOINTS.EMAILS.LOGS(eventId));
  return response.data;
};
