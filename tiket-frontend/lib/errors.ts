import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return error instanceof Error ? error.message : "";
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
