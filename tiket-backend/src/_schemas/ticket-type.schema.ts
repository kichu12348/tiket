const ticketTypeObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    isHidden: { type: "boolean" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    price: { type: "string" },
    quantityLimit: { type: ["integer", "null"], minimum: 1 },
    saleStart: { type: ["string", "null"], format: "date-time" },
    saleEnd: { type: ["string", "null"], format: "date-time" },
    isRefundable: { type: "boolean" },
    refundableUntil: { type: ["string", "null"], format: "date-time" },
    isTransferable: { type: "boolean" },
    maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
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
        isHidden: { type: "boolean" },
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number", minimum: 0, maximum: 10000000 },
        quantityLimit: { type: ["integer", "null"], minimum: 1 },
        saleStart: { type: "string", format: "date-time" },
        saleEnd: { type: "string", format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: "string", format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
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
        ticketTypeId: { type: "string" },
      },
    },
    body: {
      type: "object",
      properties: {
        isHidden: { type: "boolean" },
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number", minimum: 0, maximum: 10000000 },
        quantityLimit: { type: ["integer", "null"], minimum: 1 },
        saleStart: { type: ["string", "null"], format: "date-time" },
        saleEnd: { type: ["string", "null"], format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: ["string", "null"], format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
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
        ticketTypeId: { type: "string" },
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
