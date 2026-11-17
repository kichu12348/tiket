import { useEffect, useState } from "react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import { setClientToken } from "@/lib/api";
import { syncSessionToken } from "@/api/auth";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";

const googleCallbackSearchSchema = z.object({
  token: z.string().optional(),
  redirect: z.string().optional(),
  mode: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/google/callback")({
  validateSearch: googleCallbackSearchSchema,
  component: GoogleCallbackPage,
});

export default function GoogleCallbackPage() {
  const search = (useSearch({ strict: false }) || {}) as z.infer<
    typeof googleCallbackSearchSchema
  >;
  const { token, redirect, mode, error } = search;
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Completing Google Sign-In...");

  useEffect(() => {
    const safeRedirect =
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.includes("\\")
        ? redirect
        : "/home";

    if (error) {
      const errorMsg =
        error === "unverified_google_email"
          ? "Your Google email is unverified. Please verify your Google email."
          : error === "oauth_state_invalid"
            ? "Google Sign-In session expired or was invalid. Please try again."
            : "Google Sign-In failed. Please try again.";

      toast.error(errorMsg);

      if (mode === "popup" && typeof window !== "undefined" && window.opener) {
        window.opener.postMessage(
          { type: "TIKET_GOOGLE_AUTH_ERROR", error: errorMsg },
          window.location.origin,
        );
        window.close();
        return;
      }

      navigate({
        to: "/signin",
        search: { error },
        replace: true,
      });
      return;
    }

    if (!token) {
      toast.error("No authentication token received");
      navigate({ to: "/signin", replace: true });
      return;
    }

    const processAuth = async () => {
      try {
        setClientToken(token);
        await syncSessionToken(token);

        if (
          mode === "popup" &&
          typeof window !== "undefined" &&
          window.opener
        ) {
          setStatusText("Closing window...");
          window.opener.postMessage(
            { type: "TIKET_GOOGLE_AUTH_SUCCESS", token },
            window.location.origin,
          );
          window.close();
        } else {
          setStatusText("Redirecting...");
          navigate({ to: safeRedirect, replace: true });
        }
      } catch (err) {
        console.error("Auth callback processing failed:", err);
        toast.error("Failed to complete sign in. Please try again.");
        navigate({ to: "/signin", replace: true });
      }
    };

    processAuth();
  }, [token, redirect, mode, error, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        backgroundColor: "var(--color-bg-base, #0a0a0a)",
        color: "var(--color-text-primary, #ffffff)",
      }}
    >
      <BeatLoader size={10} color="var(--color-accent-orange, #ff6b00)" />
      <p
        style={{
          fontSize: "0.95rem",
          color: "var(--color-text-muted, rgba(255, 255, 255, 0.7))",
        }}
      >
        {statusText}
      </p>
    </div>
  );
}
