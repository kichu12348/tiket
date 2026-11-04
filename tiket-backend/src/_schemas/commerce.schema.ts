const uuid = { type: "string", format: "uuid" };
export const eventParams = {
  type: "object",
  required: ["eventId"],
  properties: { eventId: uuid },
};
export const eventSchema = { schema: { params: eventParams } };
const orderParams = {
  ...eventParams,
  required: ["eventId", "orderId"],
  properties: { ...eventParams.properties, orderId: uuid },
};
export const refundSchema = {
  schema: {
    params: orderParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["amountPaise", "reason"],
      properties: {
        amountPaise: { type: "integer", minimum: 1, maximum: 2000000000 },
        reason: { type: "string", minLength: 1, maxLength: 500 },
        voidTicketIds: {
          type: "array",
          maxItems: 20,
          uniqueItems: true,
          items: uuid,
        },
      },
    },
  },
};
export const decisionSchema = {
  schema: {
    params: orderParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["decision"],
      properties: {
        decision: { type: "string", enum: ["approve", "decline"] },
      },
    },
  },
};
export const couponSchema = {
  schema: {
    params: eventParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["code", "kind", "value", "ticketTypeIds", "isActive"],
      properties: {
        code: { type: "string", pattern: "^[A-Za-z0-9_-]{2,64}$" },
        kind: { type: "string", enum: ["fixed", "percent", "access"] },
        value: { type: "integer", minimum: 0, maximum: 2000000000 },
        ticketTypeIds: {
          type: "array",
          maxItems: 100,
          uniqueItems: true,
          items: uuid,
        },
        maxUses: { type: ["integer", "null"], minimum: 1 },
        startsAt: { type: ["string", "null"], format: "date-time" },
        endsAt: { type: ["string", "null"], format: "date-time" },
        isActive: { type: "boolean" },
      },
    },
  },
};
export const availabilitySchema = {
  schema: {
    params: eventParams,
    querystring: {
      type: "object",
      properties: { code: { type: "string", maxLength: 64 } },
    },
  },
};

export const blacklistQuerySchema = {
  schema: {
    params: eventParams,
  },
};

export const createBlacklistSchema = {
  schema: {
    params: eventParams,
    body: {
      type: "object",
      additionalProperties: false,
      properties: {
        targetUserId: uuid,
        pattern: { type: "string", minLength: 1, maxLength: 255 },
        scope: { type: "string", enum: ["event", "organization"] },
        reason: { type: "string", maxLength: 500 },
        cancelExistingTickets: { type: "boolean" },
      },
      anyOf: [{ required: ["targetUserId"] }, { required: ["pattern"] }],
    },
  },
};

const blacklistParams = {
  type: "object",
  required: ["eventId", "blacklistId"],
  properties: {
    eventId: uuid,
    blacklistId: uuid,
  },
};

export const deleteBlacklistSchema = {
  schema: {
    params: blacklistParams,
  },
};

