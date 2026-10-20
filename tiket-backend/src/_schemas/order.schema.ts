const uuid = { type: "string", format: "uuid" };
export const checkoutBody = {
  type: "object",
  additionalProperties: false,
  required: ["eventId", "purchases"],
  properties: {
    eventId: uuid,
    code: { type: "string", maxLength: 64 },
    purchases: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ticketTypeId"],
        properties: {
          ticketTypeId: uuid,
          formResponses: {
            type: "array",
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["fieldId", "responseValue"],
              properties: {
                fieldId: uuid,
                responseValue: { type: "string", maxLength: 10000 },
              },
            },
          },
        },
      },
    },
  },
};
export const createOrderSchema = { schema: { body: checkoutBody } };
export const orderParamsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["orderId"],
      properties: { orderId: uuid },
    },
  },
};
