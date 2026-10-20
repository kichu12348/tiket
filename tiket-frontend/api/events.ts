import api from "@/lib/api";
import { API_ENDPOINTS, CDN_URL } from "@/constants/config";
import type {
  CreateEventPayload,
  Event,
  UpdateEventPayload,
} from "@/types/event";

export const getSignedUrl = async (filename: string, contentType: string) => {
  const response = await api.post(API_ENDPOINTS.EVENTS.GET_SIGNED_URL, {
    filename,
    contentType,
  });
  return response.data as { url: string; max_size: number; filename?: string };
};

export const uploadToCDN = async (signedUrlPath: string, file: File) => {
  const isDirectUrl =
    signedUrlPath.startsWith("http://") || signedUrlPath.startsWith("https://");

  if (isDirectUrl) {
    const response = await fetch(signedUrlPath, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image (${response.status})`);
    }

    const url = new URL(signedUrlPath);
    const segments = url.pathname.split("/").filter(Boolean);
    const eventsIndex = segments.indexOf("events");
    const filename =
      eventsIndex !== -1
        ? segments.slice(eventsIndex).join("/")
        : segments[segments.length - 1];

    return { filename };
  }

  const formData = new FormData();
  formData.append("file", file);

  // Fallback for legacy proxy
  const response = await fetch(`${CDN_URL}${signedUrlPath}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload image to CDN");
  }

  const data = await response.json();
  return data as { filename: string };
};

export const createEvent = async (payload: CreateEventPayload) => {
  const response = await api.post(API_ENDPOINTS.EVENTS.CREATE, payload);
  return response;
};

export const updateEvent = async (
  id: string,
  payload: UpdateEventPayload,
): Promise<Event> => {
  const response = await api.patch(API_ENDPOINTS.EVENTS.UPDATE(id), payload);
  return response.data;
};

export const updateEventSlug = async (
  id: string,
  slug: string,
): Promise<{ id: string; slug: string; message: string }> => {
  const response = await api.patch(API_ENDPOINTS.EVENTS.UPDATE_SLUG(id), {
    slug,
  });
  return response.data;
};

export const getEvent = async (id: string): Promise<Event> => {
  const response = await api.get(API_ENDPOINTS.EVENTS.GET(id));
  return response.data;
};

export interface EventHost {
  id: string;
  name: string;
  email: string;
  role: string;
  isCreator: boolean;
}

export const getEventHosts = async (id: string): Promise<EventHost[]> => {
  const response = await api.get(API_ENDPOINTS.EVENTS.HOSTS(id));
  return response.data;
};
