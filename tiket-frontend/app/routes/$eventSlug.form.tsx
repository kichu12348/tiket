import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { fetchRegistrationFormData } from "../[eventSlug]/api/eventPageServer";
import RegistrationFormPage from "@/app/[eventSlug]/form/page";

const searchSchema = z.object({
  t: z.string().optional(),
  ticketTypeId: z.string().optional(),
});

export const Route = createFileRoute("/$eventSlug/form")({
  validateSearch: (search) => searchSchema.parse(search),
  loader: async ({ params }) => {
    const data = await fetchRegistrationFormData({ data: params.eventSlug });
    if (data.notFound) {
      throw notFound();
    }
    if (data.redirectTo) {
      throw redirect({ href: data.redirectTo });
    }
    return data;
  },
  component: RegistrationFormPage,
});
