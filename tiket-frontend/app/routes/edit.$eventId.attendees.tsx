import { createFileRoute } from "@tanstack/react-router";
import AttendeesPage from "@/app/edit/attendees/page";

export const Route = createFileRoute("/edit/$eventId/attendees")({
  ssr: false,
  component: AttendeesPage,
});
