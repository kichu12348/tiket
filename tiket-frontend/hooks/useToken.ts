"use client";
import { useRef } from "react";
import { removeTokenServer } from "@/actions/removeToken";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getToken } from "@/lib/getToken";

export async function removeToken() {
  try {
    await removeTokenServer();
  } catch (error) {
    console.error("Error removing token:", error);
    throw new Error("Failed to remove token");
  }
}

export function useToken() {
  const router = useRouter();
  const tokenRef = useRef<string | undefined>(undefined);

  async function getAuthToken() {
    if (tokenRef.current) {
      return tokenRef.current;
    }

    const token = await getToken();
    tokenRef.current = token;
    return token;
  }

  async function logout() {
    try {
      await removeToken();
      tokenRef.current = undefined;
      router.push("/signin");
    } catch (error) {
      console.error("Error removing token:", error);
      toast.error("Error removing token");
    }
  }

  return { logout, getAuthToken };
}
