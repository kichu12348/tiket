import { createFileRoute } from "@tanstack/react-router";
import EditDetailsPage from "@/app/edit/details/page";

export const Route = createFileRoute("/edit/$eventId/details")({
  ssr: false,
  component: EditDetailsPage,
});
