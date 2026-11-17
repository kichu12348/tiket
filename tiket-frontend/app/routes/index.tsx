import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/getToken";
import LandingPage from "@/app/page";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const token = await getToken();
    if (token) {
      throw redirect({ to: "/home" });
    }
    return { token };
  },
  component: LandingPage,
});
