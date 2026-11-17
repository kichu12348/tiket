import { createFileRoute } from "@tanstack/react-router";
import EditSettingsPage from "@/app/edit/settings/page";

export const Route = createFileRoute("/edit/$eventId/settings")({
  ssr: false,
  component: EditSettingsPage,
});
