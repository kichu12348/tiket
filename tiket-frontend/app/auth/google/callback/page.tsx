"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setClientToken } from "@/lib/api";
import { syncSessionToken } from "@/api/auth";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusText, setStatusText] = useState("Completing Google Sign-In...");

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") || "/home";
    const mode = searchParams.get("mode") || "redirect";
    const error = searchParams.get("error");

    const safeRedirect =
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

      if (mode === "popup" && window.opener) {
        window.opener.postMessage(
          { type: "TIKET_GOOGLE_AUTH_ERROR", error: errorMsg },
          window.location.origin,
        );
        window.close();
        return;
      }

      router.replace(`/signin?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      toast.error("No authentication token received");
      router.replace("/signin");
      return;
    }

    const processAuth = async () => {
      try {
        setClientToken(token);
        await syncSessionToken(token);

        if (mode === "popup" && window.opener) {
          setStatusText("Closing window...");
          window.opener.postMessage(
            { type: "TIKET_GOOGLE_AUTH_SUCCESS", token },
            window.location.origin,
          );
          window.close();
        } else {
          setStatusText("Redirecting...");
          router.replace(safeRedirect);
        }
      } catch (err) {
        console.error("Auth callback processing failed:", err);
        toast.error("Failed to complete sign in. Please try again.");
        router.replace("/signin");
      }
    };

    processAuth();
  }, [searchParams, router]);

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

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--color-bg-base, #0a0a0a)",
          }}
        >
          <BeatLoader size={10} color="var(--color-accent-orange, #ff6b00)" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
