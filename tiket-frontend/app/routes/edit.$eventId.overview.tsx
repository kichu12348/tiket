import { createFileRoute } from "@tanstack/react-router";
import EditOverviewPage from "@/app/edit/overview/page";

export const Route = createFileRoute("/edit/$eventId/overview")({
  ssr: false,
  component: EditOverviewPage,
});
