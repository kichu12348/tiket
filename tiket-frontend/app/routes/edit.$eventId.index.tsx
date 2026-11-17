import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/edit/$eventId/")({
  ssr: false,
  beforeLoad: ({ params }: { params: { eventId: string } }) => {
    throw redirect({
      to: "/edit/$eventId/overview",
      params: { eventId: params.eventId },
    });
  },
  component: () => null,
});
