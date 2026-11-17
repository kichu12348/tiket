import { createFileRoute } from "@tanstack/react-router";
import EditTicketsPage from "@/app/edit/tickets/page";

export const Route = createFileRoute("/edit/$eventId/tickets")({
  ssr: false,
  component: EditTicketsPage,
});
