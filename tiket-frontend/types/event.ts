export interface Event {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  color: string | null;
  locationType: "online" | "offline" | "hybrid";
  locationDetails: LocationDetails | null;
  startDate: string;
  endDate: string;
  timezone: string;
  registrationStart: string | null;
  registrationEnd: string | null;
  fontFamily: string;
  requireApproval: boolean;
  capacity: number | null;
  status: "draft" | "published" | "completed" | "cancelled";
  slug: string;
  organizationId: string;
  isAssociated?: boolean;
  createdAt: string;
  updatedAt: string;
}

/*"name": "Samagata Foundation",
        "address": "Cobalt, 4th floor, 46/1, Church St, Haridevpur, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560001, India",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "placeId": "ChIJ5Y8CEAAXrjsRDhd-9sSHi6w",
        "lat": 12.9756186,
        "lng": 77.60275589999999 */

export interface LocationDetails {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  link?: string;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  coverImage: string | null;
  locationType: "online" | "offline" | "hybrid";
  locationDetails: LocationDetails | null;
  startDate: string;
  endDate: string;
  timezone: string;
  registrationStart: string;
  registrationEnd: string;
  fontFamily: string;
  requireApproval: boolean;
  capacity: number | null;
  color: string;
  status: "published" | "draft" | "completed" | "cancelled";
  slug: string;
}

export interface UpdateEventPayload extends Partial<
  Omit<CreateEventPayload, "status">
> {
  status?: "draft" | "published" | "completed" | "cancelled";
}
