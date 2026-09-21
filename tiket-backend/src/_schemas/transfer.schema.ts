const transferResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    ticketId: { type: "string" },
    fromUserId: { type: "string" },
    toUserId: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const initiateTransferSchema = {
  schema: {
    params: {
      type: "object",
      required: ["ticketId"],
      properties: { ticketId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["targetEmail"],
      properties: {
        targetEmail: { type: "string", format: "email" },
      },
    },
    response: {
      201: transferResponseObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const acceptTransferSchema = {
  schema: {
    params: {
      type: "object",
      required: ["transferId"],
      properties: { transferId: { type: "string" } },
    },
    response: {
      200: {
          type: "object",
          properties: {
              message: { type: "string" },
              transfer: transferResponseObj
          }
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
