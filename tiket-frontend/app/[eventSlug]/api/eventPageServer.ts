import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { TOKEN_KEY } from "@/constants/config";
import {
  getEventBySlug,
  getMe,
  getEventHosts,
  getEventAvailability,
} from "./eventApi";
import {
  fetchTicketTypes,
  fetchFormFields,
} from "../form/services/registrationService";
import type { Event } from "@/types/event";
import type { Availability } from "@/types/commerce";
import type { AuthenticatedUser, EventHost } from "./eventApi";
import type { TicketType } from "@/types/ticketType";
import type { FormField } from "@/types/form";

export interface EventPageData {
  event: Event;
  user: AuthenticatedUser | null;
  hosts: EventHost[];
  availability: Availability | null;
}

export const fetchEventPageData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<EventPageData | null> => {
    const token = getCookie(TOKEN_KEY);
    const event = await getEventBySlug(slug, token);
    if (!event) return null;

    const [user, hosts, availability] = await Promise.all([
      token ? getMe(token) : Promise.resolve(null),
      token ? getEventHosts(event.id, token) : Promise.resolve([]),
      getEventAvailability(event.id),
    ]);

    return {
      event,
      user,
      hosts,
      availability,
    };
  });

export interface RegistrationFormData {
  notFound?: boolean;
  redirectTo?: string;
  event?: Event;
  user?: AuthenticatedUser;
  ticketTypes?: TicketType[];
  formFields?: FormField[];
}

export const fetchRegistrationFormData = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<RegistrationFormData> => {
    const token = getCookie(TOKEN_KEY);
    const event = await getEventBySlug(slug, token);
    if (!event) {
      return { notFound: true };
    }

    const user = token ? await getMe(token) : null;
    if (!user) {
      return { redirectTo: `/signin?redirect=/${slug}/form` };
    }

    if (event.isAssociated) {
      return { redirectTo: `/edit/${event.id}/overview` };
    }

    const [ticketTypes, formFields] = await Promise.all([
      fetchTicketTypes(event.id),
      fetchFormFields(event.id),
    ]);

    return {
      event,
      user,
      ticketTypes,
      formFields,
    };
  });
