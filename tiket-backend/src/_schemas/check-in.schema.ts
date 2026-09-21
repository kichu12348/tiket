const checkInResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    ticketId: { type: "string" },
    loggedByUserId: { type: "string" },
    checkedInAt: { type: "string", format: "date-time" },
  },
};

const ticketResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    status: { type: "string" },
    userId: { type: "string" }, 
  }
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const scanTicketSchema = {
  schema: {
    body: {
      type: "object",
      required: ["qrCode"],
      properties: {
        qrCode: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          message: { type: "string" },
          checkIn: checkInResponseObj,
          ticket: ticketResponseObj
        }
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
