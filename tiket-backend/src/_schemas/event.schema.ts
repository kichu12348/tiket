const locationDetailsSchema = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    state: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    placeId: { type: ["string", "null"] },
    lat: { type: ["number", "null"] },
    lng: { type: ["number", "null"] },
    link: { type: ["string", "null"] },
  },
};

const eventResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: ["string", "null"] },
    coverImage: { type: ["string", "null"] },
    color: { type: ["string", "null"] },
    locationType: { type: "string", enum: ["online", "offline", "hybrid"] },
    locationDetails: locationDetailsSchema,
    startDate: { type: "string", format: "date-time" },
    endDate: { type: "string", format: "date-time" },
    timezone: { type: "string" },
    registrationStart: { type: ["string", "null"], format: "date-time" },
    registrationEnd: { type: ["string", "null"], format: "date-time" },
    fontFamily: { type: "string" },
    requireApproval: { type: "boolean" },
    capacity: { type: ["integer", "null"] },
    status: {
      type: "string",
      enum: ["draft", "published", "completed", "cancelled"],
    },
    slug: { type: "string" },
    organizationId: { type: "string" },
    isAssociated: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createEventSchema = {
  schema: {
    body: {
      type: "object",
      required: ["title", "startDate", "endDate"],
      properties: {
        title: { type: "string", minLength: 3 },
        description: { type: "string" },
        coverImage: { type: "string" },
        color: { type: "string" },
        locationType: { type: "string", enum: ["online", "offline", "hybrid"] },
        locationDetails: locationDetailsSchema,
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
        timezone: { type: "string" },
        registrationStart: { type: "string", format: "date-time" },
        registrationEnd: { type: "string", format: "date-time" },
        fontFamily: { type: "string" },
        requireApproval: { type: "boolean" },
        capacity: { type: ["integer", "null"] },
        status: { type: "string", enum: ["draft", "published"] },
      },
    },
    response: {
      201: eventResponseObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const updateEventSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    body: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 3 },
        description: { type: "string" },
        coverImage: { type: "string" },
        color: { type: "string" },
        locationType: { type: "string", enum: ["online", "offline", "hybrid"] },
        locationDetails: locationDetailsSchema,
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time" },
        timezone: { type: "string" },
        registrationStart: { type: "string", format: "date-time" },
        registrationEnd: { type: "string", format: "date-time" },
        fontFamily: { type: "string" },
        requireApproval: { type: "boolean" },
        capacity: { type: ["integer", "null"] },
        status: {
          type: "string",
          enum: ["draft", "published", "completed", "cancelled"],
        },
      },
      minProperties: 1,
    },
    response: {
      200: eventResponseObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const updateEventSlugSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          slug: { type: "string" },
          id: { type: "string" },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEventsSchema = {
  schema: {
    response: {
      200: {
        type: "array",
        items: eventResponseObj,
      },
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEventByIdSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    response: {
      200: eventResponseObj,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEventBySlugSchema = {
  schema: {
    params: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
    response: {
      200: eventResponseObj,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteEventSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: { message: { type: "string" } },
      },
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEventHostsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            isCreator: { type: "boolean" },
          },
        },
      },
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
