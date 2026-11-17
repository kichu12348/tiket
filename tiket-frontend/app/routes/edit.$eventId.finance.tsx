import { createFileRoute } from "@tanstack/react-router";
import FinancePage from "@/app/edit/finance/page";

export const Route = createFileRoute("/edit/$eventId/finance")({
  ssr: false,
  component: FinancePage,
});
