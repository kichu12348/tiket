export const userResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    type: { type: "string" },
    description: { type: ["string", "null"] },
    isVerified: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export const passwordAuthSchema = {
  schema: {
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 6 },
        name: { type: "string", minLength: 2 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          token: { type: "string" },
          user: userResponseSchema,
        },
      },
      401: errorResponseSchema,
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          needsName: { type: "boolean" },
        },
      },
      500: errorResponseSchema,
    },
  },
};

export const sendOtpSchema = {
  schema: {
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email" },
        name: { type: "string", minLength: 2 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          needsName: { type: "boolean" },
        },
      },
      500: errorResponseSchema,
    },
  },
};

export const verifyOtpSchema = {
  schema: {
    body: {
      type: "object",
      required: ["email", "otp"],
      properties: {
        email: { type: "string", format: "email" },
        otp: { type: "string", minLength: 6, maxLength: 6 },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          token: { type: "string" },
          user: userResponseSchema,
        },
      },
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getMeSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          user: userResponseSchema,
        },
      },
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
