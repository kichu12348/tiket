import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchEventPageData } from "../[eventSlug]/api/eventPageServer";
import EventPage from "@/app/[eventSlug]/page";

export const Route = createFileRoute("/$eventSlug/")({
  loader: async ({ params }) => {
    const data = await fetchEventPageData({ data: params.eventSlug });
    if (!data || !data.event) {
      throw notFound();
    }
    return data;
  },
  component: EventPage,
});
