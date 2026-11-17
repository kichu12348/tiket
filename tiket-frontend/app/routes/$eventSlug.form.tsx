import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { fetchRegistrationFormData } from "../[eventSlug]/api/eventPageServer";
import type { RegistrationFormData } from "../[eventSlug]/api/eventPageServer";
import RegistrationForm from "../[eventSlug]/form/components/RegistrationForm";
import styles from "../[eventSlug]/form/RegistrationFormPage.module.css";

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
  head: ({ loaderData }) => {
    const title = loaderData?.event?.title
      ? `Register — ${loaderData.event.title}`
      : "Register";
    const description = loaderData?.event?.title
      ? `Register for ${loaderData.event.title}`
      : "Complete your registration";
    return {
      meta: [
        { title: `${title} | Tiket` },
        { name: "description", content: description },
      ],
    };
  },
  component: RegistrationFormPage,
});

function RegistrationFormPage() {
  const data = Route.useLoaderData() as Required<RegistrationFormData>;
  const { event, user, ticketTypes, formFields } = data;

  return (
    <div
      className={styles.pageWrapper}
      style={
        {
          "--event-font": event.fontFamily,
        } as React.CSSProperties
      }
    >
      <div className={styles.background} />
      <div className={styles.page}>
        <div className={styles.header}>
          <Link
            to="/$eventSlug"
            params={{ eventSlug: event.slug }}
            className={styles.backBtn}
          >
            <ChevronLeft size={18} />
            <span>Back to event</span>
          </Link>
          <div className={styles.headerText}>
            <h1
              className={styles.eventTitle}
              style={{ fontFamily: event.fontFamily }}
            >
              {event.title}
            </h1>
            <span className={styles.eventSubtitle}>
              Complete your registration
            </span>
          </div>
        </div>

        <RegistrationForm
          event={event}
          user={user}
          ticketTypes={ticketTypes}
          formFields={formFields}
        />
      </div>
    </div>
  );
}
