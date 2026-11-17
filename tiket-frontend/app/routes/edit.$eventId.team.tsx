import { createFileRoute } from "@tanstack/react-router";
import TeamPage from "@/app/edit/team/page";

export const Route = createFileRoute("/edit/$eventId/team")({
  ssr: false,
  component: TeamPage,
});
