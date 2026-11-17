import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getToken } from "@/lib/getToken";
import SigninPage from "@/app/signin/page";

const signinSearchSchema = z.object({
  redirect: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/signin")({
  validateSearch: signinSearchSchema,
  beforeLoad: async () => {
    const token = await getToken();
    if (token) {
      throw redirect({ to: "/home" });
    }
  },
  component: SigninPage,
});
