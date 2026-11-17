import type React from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { RegistrationFormData } from "@/app/[eventSlug]/api/eventPageServer";
import RegistrationForm from "@/app/[eventSlug]/form/components/RegistrationForm";
import styles from "@/app/[eventSlug]/form/RegistrationFormPage.module.css";

const routeApi = getRouteApi("/$eventSlug/form");

export default function RegistrationFormPage() {
  const data = routeApi.useLoaderData() as Required<RegistrationFormData>;
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
