import { useState } from "react";
import {
  setClientToken,
  hydrateClientToken,
  clearClientToken,
} from "@/lib/api";
import {
  otpSendServer,
  otpVerifyServer,
  passwordLoginServer,
  logoutServer,
} from "@/api/authServer";
import type { AuthSuccessPayload } from "@/api/authServer";

interface AuthErrorPayload {
  status?: number;
  data?: {
    needsName?: boolean;
    error?: string;
    message?: string;
  };
  message?: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError("");
    try {
      const data = (await otpVerifyServer({
        data: { email, otp },
      })) as AuthSuccessPayload;
      if (data?.token) {
        setClientToken(data.token);
      } else {
        await hydrateClientToken();
      }
      return { success: true };
    } catch (err: unknown) {
      const authErr = err as AuthErrorPayload;
      const msg =
        authErr.data?.error || authErr.data?.message || authErr.message || "Invalid OTP. Try again.";
      setError(msg);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string, name?: string) => {
    setIsLoading(true);
    setError("");
    try {
      await otpSendServer({ data: { email, name } });
      return { success: true };
    } catch (err: unknown) {
      const authErr = err as AuthErrorPayload;
      if (authErr.status === 404 && authErr.data?.needsName) {
        return { success: false, needsName: true };
      }
      const msg =
        authErr.data?.error || authErr.data?.message || authErr.message || "Failed to send OTP. Try again.";
      setError(msg);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (
    email: string,
    password: string,
    name?: string,
  ) => {
    setIsLoading(true);
    setError("");
    try {
      const data = (await passwordLoginServer({
        data: { email, password, name },
      })) as AuthSuccessPayload;
      if (data?.token) {
        setClientToken(data.token);
      } else {
        await hydrateClientToken();
      }
      return { success: true };
    } catch (err: unknown) {
      const authErr = err as AuthErrorPayload;
      if (authErr.status === 404 && authErr.data?.needsName) {
        return { success: false, needsName: true };
      }
      const msg =
        authErr.data?.error ||
        authErr.data?.message ||
        authErr.message ||
        "Invalid credentials. Try again.";
      setError(msg);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    clearClientToken();
    try {
      await logoutServer();
    } catch (err: unknown) {
      console.error("Logout error:", err);
    }
  };

  return {
    verifyOtp,
    sendOtp,
    loginWithPassword,
    logout,
    isLoading,
    error,
    setError,
  };
}
