import { createFileRoute } from "@tanstack/react-router";
import EditFormsPage from "@/app/edit/forms/page";

export const Route = createFileRoute("/edit/$eventId/forms")({
  ssr: false,
  component: EditFormsPage,
});
