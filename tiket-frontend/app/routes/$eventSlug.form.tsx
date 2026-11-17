import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { fetchRegistrationFormData } from "../[eventSlug]/api/eventPageServer";
import RegistrationFormPage from "@/app/[eventSlug]/form/page";

export const Route = createFileRoute("/$eventSlug/form")({
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
