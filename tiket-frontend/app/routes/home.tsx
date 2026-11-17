import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/getToken";
import HomePage from "@/app/home/page";

export const Route = createFileRoute("/home")({
  beforeLoad: async () => {
    const token = await getToken();
    if (!token) {
      throw redirect({ to: "/signin" });
    }
  },
  component: HomePage,
});
