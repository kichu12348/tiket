import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import {
  FormField,
  CreateFormFieldPayload,
  UpdateFormFieldPayload,
} from "@/types/form";

export const getFormFields = async (eventId: string): Promise<FormField[]> => {
  const response = await api.get(API_ENDPOINTS.FORMS.GET_ALL(eventId));
  return response.data;
};

export const createFormField = async (
  eventId: string,
  payload: CreateFormFieldPayload
): Promise<FormField> => {
  const response = await api.post(
    `${API_ENDPOINTS.FORMS.CREATE}/${eventId}`,
    payload
  );
  return response.data;
};

export const updateFormField = async (
  eventId: string,
  fieldId: string,
  payload: UpdateFormFieldPayload
): Promise<FormField> => {
  const response = await api.patch(
    API_ENDPOINTS.FORMS.UPDATE(eventId, fieldId),
    payload
  );
  return response.data;
};

export const deleteFormField = async (
  eventId: string,
  fieldId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.FORMS.DELETE(eventId, fieldId)
  );
  return response.data;
};

export const deleteFormPage = async (
  eventId: string,
  pageNum: number
): Promise<{ message: string }> => {
  const response = await api.delete(
    API_ENDPOINTS.FORMS.DELETE_PAGE(eventId, pageNum)
  );
  return response.data;
};
