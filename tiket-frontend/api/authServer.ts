import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { API_ENDPOINTS, TOKEN_KEY, MAX_AGE } from "@/constants/config";

export interface AuthUserPayload {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface AuthSuccessPayload {
  token?: string;
  message?: string;
  user?: AuthUserPayload;
}

export const syncSessionTokenServer = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      setCookie(TOKEN_KEY, data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: MAX_AGE,
      });
      return { success: true };
    } catch (err) {
      console.error("Session sync error:", err);
      return { success: false };
    }
  });

export const logoutServer = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      deleteCookie(TOKEN_KEY);
      return { message: "Logged out successfully" };
    } catch (err) {
      console.error("Logout error:", err);
      return { message: "Logged out" };
    }
  },
);

export const otpSendServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; name?: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(API_ENDPOINTS.BACKEND.AUTH.OTP_SEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = await response.json();
    if (!response.ok) {
      const err = new Error(resData.error || resData.message || "Failed to send OTP");
      (err as unknown as { status: number; data: unknown }).status = response.status;
      (err as unknown as { status: number; data: unknown }).data = resData;
      throw err;
    }
    return resData;
  });

export const otpVerifyServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; otp: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(API_ENDPOINTS.BACKEND.AUTH.OTP_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = (await response.json()) as AuthSuccessPayload;
    if (!response.ok) {
      const err = new Error((resData as { error?: string }).error || resData.message || "Invalid OTP");
      (err as unknown as { status: number; data: unknown }).status = response.status;
      (err as unknown as { status: number; data: unknown }).data = resData;
      throw err;
    }
    if (resData.token) {
      try {
        setCookie(TOKEN_KEY, resData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
          maxAge: MAX_AGE,
        });
      } catch (e) {
        console.error("Failed to set cookie:", e);
      }
    }
    return resData;
  });

export const passwordLoginServer = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; name?: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(API_ENDPOINTS.BACKEND.AUTH.PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const resData = (await response.json()) as AuthSuccessPayload;
    if (!response.ok) {
      const err = new Error((resData as { error?: string }).error || resData.message || "Invalid credentials");
      (err as unknown as { status: number; data: unknown }).status = response.status;
      (err as unknown as { status: number; data: unknown }).data = resData;
      throw err;
    }
    if (resData.token) {
      try {
        setCookie(TOKEN_KEY, resData.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
          maxAge: MAX_AGE,
        });
      } catch (e) {
        console.error("Failed to set cookie:", e);
      }
    }
    return resData;
  });
