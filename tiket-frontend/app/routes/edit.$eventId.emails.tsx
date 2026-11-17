import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import EditEmailsPage from "@/app/edit/emails/page";

const emailsSearchSchema = z.object({
  tab: z.string().optional(),
});

export const Route = createFileRoute("/edit/$eventId/emails")({
  ssr: false,
  validateSearch: emailsSearchSchema,
  component: EditEmailsPage,
});
