export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;

//MAPS
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
export const MAP_ID = process.env.NEXT_PUBLIC_MAP_ID!;

//constants
export const TOKEN_KEY = "authToken";
export const MAX_AGE = 63072000;

export const API_ENDPOINTS = {
  BACKEND: {
    AUTH: {
      PASSWORD: `${API_URL}/api/auth/password`,
      OTP_SEND: `${API_URL}/api/auth/otp/send`,
      OTP_VERIFY: `${API_URL}/api/auth/otp/verify`,
    },
  },
  FRONTEND: {
    AUTH: {
      PASSWORD: "/api/auth/password",
      OTP_SEND: "/api/auth/otp/send",
      OTP_VERIFY: "/api/auth/otp/verify",
      LOGOUT: "/api/auth/logout",
    },
  },
  EVENTS: {
    ME: "/api/events/me",
    CREATE: "/api/events",
    GET_SIGNED_URL: "/api/events/upload/signed-url",
    UPDATE: (id: string) => `/api/events/${id}`,
    UPDATE_SLUG: (id: string) => `/api/events/${id}/slug`,
    GET: (id: string) => `/api/events/${id}`,
    GET_BY_SLUG: (slug: string) => `/api/events/slug/${slug}`,
    HOSTS: (id: string) => `/api/events/${id}/hosts`,
  },
  TICKET_TYPES: {
    CREATE: `/api/ticket-types`, // /api/ticket-types/:eventId
    GET_ALL: (eventId: string) => `/api/ticket-types/${eventId}`,
    UPDATE: (eventId: string, ticketTypeId: string) =>
      `/api/ticket-types/${eventId}/${ticketTypeId}`,
    DELETE: (eventId: string, ticketTypeId: string) =>
      `/api/ticket-types/${eventId}/${ticketTypeId}`,
    REORDER: (eventId: string) => `/api/ticket-types/${eventId}/reorder`,
  },
  FORMS: {
    CREATE: `/api/forms`, // /api/forms/:eventId
    GET_ALL: (eventId: string) => `/api/forms/${eventId}`,
    UPDATE: (eventId: string, fieldId: string) =>
      `/api/forms/${eventId}/${fieldId}`,
    DELETE: (eventId: string, fieldId: string) =>
      `/api/forms/${eventId}/${fieldId}`,
    DELETE_PAGE: (eventId: string, pageNum: number) =>
      `/api/forms/${eventId}/pages/${pageNum}`,
  },
  TICKETS: {
    GET: (ticketId: string) => `/api/tickets/${ticketId}`, // To be implemented in backend
  },
  ORDERS: {
    CREATE: `/api/orders`,
    PAY: (orderId: string) => `/api/orders/${orderId}/pay`,
  },
  PAYMENTS: {
    VERIFY: `/api/payments/verify`,
    WEBHOOK: `/api/payments/webhook`,
  },
  TEAM: {
    ROLES_CREATE: (eventId: string) => `/api/teams/${eventId}/roles`,
    ROLES_GET: (eventId: string) => `/api/teams/${eventId}/roles`,
    ROLES_UPDATE: (eventId: string, roleId: string) => `/api/teams/${eventId}/roles/${roleId}`,
    ROLES_DELETE: (eventId: string, roleId: string) => `/api/teams/${eventId}/roles/${roleId}`,
    MEMBERS_ADD: (eventId: string) => `/api/teams/${eventId}/members`,
    MEMBERS_GET: (eventId: string) => `/api/teams/${eventId}/members`,
    MEMBERS_DELETE: (eventId: string, memberId: string) => `/api/teams/${eventId}/members/${memberId}`,
  },
  ATTENDEES: {
    GET_ALL: (eventId: string) => `/api/attendees/${eventId}`,
    STATS: (eventId: string) => `/api/attendees/${eventId}/stats`,
    GET_BY_ID: (eventId: string, ticketId: string) => `/api/attendees/${eventId}/${ticketId}`,
    FORM_RESPONSES: (eventId: string, ticketId: string) => `/api/attendees/${eventId}/${ticketId}/form-responses`,
    TOGGLE_CHECKIN: (eventId: string, ticketId: string) => `/api/attendees/${eventId}/${ticketId}/check-in`,
    CANCEL: (eventId: string, ticketId: string) => `/api/attendees/${eventId}/${ticketId}/cancel`,
    MANUAL_REGISTER: (eventId: string) => `/api/attendees/${eventId}/manual-register`,
    EXPORT: (eventId: string) => `/api/attendees/${eventId}/export`,
  },
  EMAILS: {
    TEMPLATES: (eventId: string) => `/api/emails/events/${eventId}/templates`,
    TEMPLATE_BY_ID: (eventId: string, templateId: string) => `/api/emails/events/${eventId}/templates/${templateId}`,
    RESET_TEMPLATE: (eventId: string, templateId: string) => `/api/emails/events/${eventId}/templates/${templateId}/reset`,
    VARIABLES: (eventId: string) => `/api/emails/events/${eventId}/variables`,
    SEND_TEST: (eventId: string) => `/api/emails/events/${eventId}/send-test`,
    SEND_BATCH: (eventId: string) => `/api/emails/events/${eventId}/send-batch`,
    LOGS: (eventId: string) => `/api/emails/events/${eventId}/logs`,
  },
};

export interface ImageSrcOptions {
  width?: number;
  height?: number;
  ext?: "jpeg" | "webp";
  filter?: "tri" | "lanc" | "gauss" | "nearest";
}

export const getImageUrl = (filename: string, options?: ImageSrcOptions) => {
  if (options?.width || options?.height || options?.ext || options?.filter) {
    const params: string[] = [];
    if (options?.width) params.push(`w=${options.width}`);
    if (options?.height) params.push(`h=${options.height}`);
    if (options?.ext) params.push(`ext=${options.ext}`);
    if (options?.filter) params.push(`filter=${options.filter}`);
    return `${CDN_URL}/image/${filename}?${params.join("&")}`;
  }
  return `${CDN_URL}/image/${filename}`;
};
