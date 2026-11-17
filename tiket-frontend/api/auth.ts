import api from "@/lib/api";
import { API_ENDPOINTS } from "@/constants/config";
import { syncSessionTokenServer } from "./authServer";

export interface AuthenticatedUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  type?: string;
  description?: string | null;
  isVerified?: boolean;
  createdAt?: string;
}

export async function syncSessionToken(token: string): Promise<void> {
  await syncSessionTokenServer({ data: { token } });
}

export async function getMe(): Promise<AuthenticatedUserProfile | null> {
  try {
    const res = await api.get<{ user: AuthenticatedUserProfile }>(
      API_ENDPOINTS.AUTH.ME,
    );
    return res.data?.user ?? null;
  } catch {
    return null;
  }
}

export function getGoogleOAuthUrl(params?: {
  redirect?: string;
  mode?: "popup" | "redirect";
}): string {
  const base = API_ENDPOINTS.BACKEND.AUTH.GOOGLE;
  const searchParams = new URLSearchParams();
  if (params?.redirect) {
    searchParams.set("redirect", params.redirect);
  }
  if (params?.mode) {
    searchParams.set("mode", params.mode);
  }
  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
}
