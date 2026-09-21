const ticketTypeObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    price: { type: "string" }, 
    quantityLimit: { type: ["integer", "null"] },
    saleStart: { type: ["string", "null"], format: "date-time" },
    saleEnd: { type: ["string", "null"], format: "date-time" },
    isRefundable: { type: "boolean" },
    refundableUntil: { type: ["string", "null"], format: "date-time" },
    isTransferable: { type: "boolean" },
    maxTransfers: { type: "integer" },
    sortOrder: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number" }, 
        quantityLimit: { type: "integer" },
        saleStart: { type: "string", format: "date-time" },
        saleEnd: { type: "string", format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: "string", format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer" },
      },
    },
    response: {
      201: ticketTypeObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getTicketTypesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: ticketTypeObj,
      },
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const updateTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketTypeId"],
      properties: { 
        eventId: { type: "string" },
        ticketTypeId: { type: "string" }
      },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number" },
        quantityLimit: { type: ["integer", "null"] },
        saleStart: { type: ["string", "null"], format: "date-time" },
        saleEnd: { type: ["string", "null"], format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: ["string", "null"], format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer" },
      },
      minProperties: 1,
    },
    response: {
      200: ticketTypeObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketTypeId"],
      properties: { 
        eventId: { type: "string" },
        ticketTypeId: { type: "string" }
      },
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

export const reorderTicketTypesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "sortOrder"],
        properties: {
          id: { type: "string" },
          sortOrder: { type: "integer" },
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: { message: { type: "string" } },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
