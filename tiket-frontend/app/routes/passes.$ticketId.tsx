import { createFileRoute } from "@tanstack/react-router";
import TicketPassPage from "@/app/passes/[ticketId]/page";

export const Route = createFileRoute("/passes/$ticketId")({
  component: TicketPassPage,
});
