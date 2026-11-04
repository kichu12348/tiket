export const verifyPaymentSchema = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["orderId"],
      properties: {
        orderId: { type: "string", format: "uuid" },
        razorpayOrderId: { type: "string", maxLength: 255 },
        razorpayPaymentId: { type: "string", maxLength: 255 },
        razorpaySignature: { type: "string", maxLength: 512 },
        providerOrderId: { type: "string", maxLength: 255 },
        providerPaymentId: { type: "string", maxLength: 255 },
        providerSignature: { type: "string", maxLength: 512 },
        providerPayload: { type: "object", additionalProperties: true },
      },
      anyOf: [
        {
          required: [
            "razorpayOrderId",
            "razorpayPaymentId",
            "razorpaySignature",
          ],
        },
        {
          required: [
            "providerOrderId",
            "providerPaymentId",
            "providerSignature",
          ],
        },
      ],
    },
  },
};

export const webhookSchema = { bodyLimit: 1048576 };
