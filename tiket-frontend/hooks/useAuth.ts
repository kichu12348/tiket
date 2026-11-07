import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { useState } from "react";
import type { AxiosError } from "axios";
import axios from "axios";
import { API_ENDPOINTS } from "@/constants/config";
import {
  setClientToken,
  hydrateClientToken,
  clearClientToken,
} from "@/lib/api";

interface AuthErrorResponse {
  error?: string;
  needsName?: boolean;
}

interface AuthSuccessResponse {
  token?: string;
  message?: string;
  user?: unknown;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axios.post<AuthSuccessResponse>(
        API_ENDPOINTS.FRONTEND.AUTH.OTP_VERIFY,
        {
          email,
          otp,
        },
      );
      if (response.data?.token) {
        setClientToken(response.data.token);
      } else {
        await hydrateClientToken();
      }
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<AuthErrorResponse>;
        setError(getErrorMessage(axiosError) || "Invalid OTP. Try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string, name?: string) => {
    setIsLoading(true);
    setError("");
    try {
      await axios.post(API_ENDPOINTS.FRONTEND.AUTH.OTP_SEND, {
        email,
        name,
      });
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<AuthErrorResponse>;
        if (
          getErrorStatus(axiosError) === 404 &&
          axiosError.response?.data?.needsName
        ) {
          return { success: false, needsName: true };
        }
        setError(
          getErrorMessage(axiosError) || "Failed to send OTP. Try again.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
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
      const response = await axios.post<AuthSuccessResponse>(
        API_ENDPOINTS.FRONTEND.AUTH.PASSWORD,
        {
          email,
          password,
          name,
        },
      );
      if (response.data?.token) {
        setClientToken(response.data.token);
      } else {
        await hydrateClientToken();
      }
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<AuthErrorResponse>;
        if (
          getErrorStatus(axiosError) === 404 &&
          axiosError.response?.data?.needsName
        ) {
          return { success: false, needsName: true };
        }
        setError(
          getErrorMessage(axiosError) || "Invalid credentials. Try again.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    clearClientToken();
    try {
      await axios.post(API_ENDPOINTS.FRONTEND.AUTH.LOGOUT);
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
