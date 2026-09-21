import { useState } from "react";
import axios, { AxiosError } from "axios";
import { API_ENDPOINTS, TOKEN_KEY } from "@/constants/config";

interface AuthErrorResponse {
  error?: string;
  needsName?: boolean;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post(API_ENDPOINTS.FRONTEND.AUTH.OTP_VERIFY, {
        email,
        otp,
      });
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<AuthErrorResponse>;
        setError(axiosError.response?.data?.error || "Invalid OTP. Try again.");
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
          axiosError.response?.status === 404 &&
          axiosError.response.data?.needsName
        ) {
          return { success: false, needsName: true };
        }
        setError(
          axiosError.response?.data?.error || "Failed to send OTP. Try again.",
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
      const res = await axios.post(API_ENDPOINTS.FRONTEND.AUTH.PASSWORD, {
        email,
        password,
        name,
      });
      return { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<AuthErrorResponse>;
        if (
          axiosError.response?.status === 404 &&
          axiosError.response.data?.needsName
        ) {
          return { success: false, needsName: true };
        }
        setError(
          axiosError.response?.data?.error || "Invalid credentials. Try again.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    verifyOtp,
    sendOtp,
    loginWithPassword,
    isLoading,
    error,
    setError,
  };
}
