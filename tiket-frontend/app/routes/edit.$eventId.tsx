import { createFileRoute, redirect } from "@tanstack/react-router";
import EditEventLayout from "@/app/edit/layout";
import { getToken } from "@/lib/getToken";

export const Route = createFileRoute("/edit/$eventId")({
  ssr: false,
  beforeLoad: async () => {
    const token = await getToken();
    if (!token) {
      throw redirect({ to: "/signin" });
    }
  },
  component: EditEventLayout,
});
