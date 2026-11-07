"use client";

import { removeTokenServer } from "@/actions/removeToken";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getClientToken, setClientToken, clearClientToken } from "@/lib/api";

export { setClientToken, clearClientToken, getClientToken };

export async function removeToken() {
  clearClientToken();
  try {
    await removeTokenServer();
  } catch (error) {
    console.error("Error removing token:", error);
    throw new Error("Failed to remove token");
  }
}

export interface UseTokenReturn {
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | undefined>;
  setAuthToken?: (token: string | null) => void;
}

export function useToken(): UseTokenReturn {
  const router = useRouter();

  async function getAuthToken(): Promise<string | undefined> {
    const token = await getClientToken();
    return token ?? undefined;
  }

  function setAuthToken(token: string | null): void {
    setClientToken(token);
  }

  async function logout() {
    try {
      clearClientToken();
      await removeToken();
      router.push("/signin");
    } catch (error) {
      console.error("Error removing token:", error);
      toast.error("Error removing token");
    }
  }

  return { logout, getAuthToken, setAuthToken };
}
