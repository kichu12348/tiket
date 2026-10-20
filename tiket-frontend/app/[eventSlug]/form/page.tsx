import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getEventBySlug, getMe } from "../api/eventApi";
import { TOKEN_KEY } from "@/constants/config";
import {
  fetchTicketTypes,
  fetchFormFields,
} from "./services/registrationService";
import RegistrationForm from "./components/RegistrationForm";
import styles from "./RegistrationFormPage.module.css";

interface PageProps {
  params: Promise<{ eventSlug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEventBySlug(resolvedParams.eventSlug);
  if (!event) return { title: "Event Not Found" };
  return {
    title: `Register — ${event.title}`,
    description: `Register for ${event.title}`,
  };
}

export default async function RegistrationFormPage({ params }: PageProps) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  const event = await getEventBySlug(resolvedParams.eventSlug, token);
  if (!event) return notFound();

  // Auth gate — redirect unauthenticated users to sign in
  const user = token ? await getMe(token) : null;
  if (!user) {
    redirect(`/signin?redirect=/${resolvedParams.eventSlug}/form`);
  }

  // Host / Team Member restriction gate — redirect associated team to event editor dashboard
  if (event.isAssociated) {
    redirect(`/edit/${event.id}/overview`);
  }

  const [ticketTypes, formFields] = await Promise.all([
    fetchTicketTypes(event.id),
    fetchFormFields(event.id),
  ]);

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
          <Link href={`/${event.slug}`} className={styles.backBtn}>
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
