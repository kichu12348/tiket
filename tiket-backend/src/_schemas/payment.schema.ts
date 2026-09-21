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

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const verifyPaymentSchema = {
  schema: {
    body: {
      type: "object",
      required: ["orderId", "razorpayOrderId", "razorpayPaymentId", "razorpaySignature"],
      properties: {
        orderId: { type: "string" },
        razorpayOrderId: { type: "string" },
        razorpayPaymentId: { type: "string" },
        razorpaySignature: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          order: orderResponseObj,
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const webhookSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          status: { type: "string" },
        },
      },
      400: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
