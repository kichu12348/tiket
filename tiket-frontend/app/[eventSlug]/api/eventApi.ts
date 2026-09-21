import { Event } from "@/types/event";
import { API_URL, API_ENDPOINTS } from "@/constants/config";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  type?: string;
  description?: string | null;
  isVerified?: boolean;
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
  } catch (error) {
    return null;
  }
}

export async function getMe(token: string): Promise<AuthenticatedUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (error) {
    return null;
  }
}
