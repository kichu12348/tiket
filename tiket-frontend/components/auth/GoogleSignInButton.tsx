"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setClientToken } from "@/lib/api";
import { syncSessionToken, getGoogleOAuthUrl } from "@/api/auth";
import { cn } from "@/lib/utils";

export interface GoogleSignInButtonProps {
  redirect?: string;
  mode?: "popup" | "redirect";
  onSuccess?: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  redirect = "/home",
  mode = "popup",
  onSuccess,
  onError,
  className,
  children,
  disabled = false,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    popupRef.current = null;
    setIsLoading(false);
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (mode === "redirect") {
      setIsLoading(true);
      window.location.href = getGoogleOAuthUrl({ redirect, mode: "redirect" });
      return;
    }

    setIsLoading(true);
    const width = 500;
    const height = 620;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popupUrl = getGoogleOAuthUrl({ redirect, mode: "popup" });

    const popup = window.open(
      popupUrl,
      "tiket_google_auth_window",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`,
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      // Popups are blocked by browser, fallback to full-page redirect
      window.location.href = getGoogleOAuthUrl({ redirect, mode: "redirect" });
      return;
    }

    popupRef.current = popup;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "TIKET_GOOGLE_AUTH_SUCCESS" && event.data.token) {
        window.removeEventListener("message", handleMessage);
        cleanup();

        const token = event.data.token as string;
        setClientToken(token);
        try {
          await syncSessionToken(token);
        } catch (e) {
          console.error("Failed to sync session cookie:", e);
        }

        if (onSuccess) {
          onSuccess(token);
        } else {
          router.replace(redirect || "/home");
        }
      } else if (
        event.data?.type === "TIKET_GOOGLE_AUTH_ERROR" &&
        event.data.error
      ) {
        window.removeEventListener("message", handleMessage);
        cleanup();
        onError?.(event.data.error);
      }
    };

    window.addEventListener("message", handleMessage);

    timerRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.removeEventListener("message", handleMessage);
        cleanup();
      }
    }, 1000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn("w-full gap-2 font-medium cursor-pointer", className)}
    >
      <GoogleIcon />
      <span>{children ?? "Continue with Google"}</span>
    </Button>
  );
}

export default GoogleSignInButton;
