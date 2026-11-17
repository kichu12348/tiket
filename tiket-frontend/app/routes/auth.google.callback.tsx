import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import GoogleCallbackPage from "@/app/auth/google/callback/page";

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
