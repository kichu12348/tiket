import { createFileRoute } from "@tanstack/react-router";
import OperationsPage from "@/app/edit/operations/page";

export const Route = createFileRoute("/edit/$eventId/operations")({
  ssr: false,
  component: OperationsPage,
});
