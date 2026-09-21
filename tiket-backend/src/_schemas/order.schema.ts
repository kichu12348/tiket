const ticketResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    ticketTypeId: { type: "string" },
    qrCode: { type: "string" },
    status: { type: "string" },
  },
};

const orderResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    userId: { type: "string" },
    totalAmount: { type: "string" },
    paymentStatus: { type: "string", enum: ["pending", "success", "failed", "refunded"] },
    paymentProvider: { type: ["string", "null"] },
    paymentIntentId: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

const razorpayOrderObj = {
  type: "object",
  nullable: true,
  properties: {
    id: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    keyId: { type: "string" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createOrderSchema = {
  schema: {
    body: {
      type: "object",
      required: ["eventId", "purchases"],
      properties: {
        eventId: { type: "string" },
        purchases: {
          type: "array",
          items: {
            type: "object",
            required: ["ticketTypeId"],
            properties: {
              ticketTypeId: { type: "string" },
              formResponses: {
                type: "array",
                items: {
                  type: "object",
                  required: ["fieldId", "responseValue"],
                  properties: {
                    fieldId: { type: "string" },
                    responseValue: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          order: orderResponseObj,
          tickets: {
            type: "array",
            items: ticketResponseObj,
          },
          razorpayOrder: razorpayOrderObj,
        },
      },
      400: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const payOrderSchema = {
  schema: {
    params: {
      type: "object",
      required: ["orderId"],
      properties: { orderId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          order: orderResponseObj,
        },
      },
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
