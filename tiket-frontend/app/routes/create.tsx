import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/getToken";
import CreateEventPage from "@/app/create/page";

export const Route = createFileRoute("/create")({
  beforeLoad: async () => {
    const token = await getToken();
    if (!token) {
      throw redirect({ to: "/signin", search: { redirect: "/create" } });
    }
  },
  component: CreateEventPage,
});
