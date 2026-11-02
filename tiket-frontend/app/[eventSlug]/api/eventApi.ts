import type { Event } from "@/types/event";
import type { Availability } from "@/types/commerce";
import { API_URL, API_ENDPOINTS } from "@/constants/config";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  type?: string;
  description?: string | null;
  isVerified?: boolean;
}

export interface EventHost {
  id: string;
  name: string;
  email: string;
  role: string;
  isCreator: boolean;
}

export async function getEventBySlug(
  slug: string,
  token?: string,
): Promise<Event | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.EVENTS.GET_BY_SLUG(slug)}`,
      {
        headers,
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getMe(token: string): Promise<AuthenticatedUser | null> {
  try {
    const res = await fetch(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function getEventHosts(
  eventId: string,
  token?: string,
): Promise<EventHost[]> {
  if (!token) return [];
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.EVENTS.HOSTS(eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getEventAvailability(
  eventId: string,
): Promise<Availability | null> {
  try {
    const res = await fetch(
      `${API_URL}${API_ENDPOINTS.COMMERCE.AVAILABILITY(eventId)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
