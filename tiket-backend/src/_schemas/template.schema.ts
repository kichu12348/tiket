const templateResponseObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    type: { type: "string", enum: ["ticket", "certificate"] },
    name: { type: "string" },
    backgroundImageUrl: { type: ["string", "null"] },
    elementsJson: { type: ["array", "object", "null"] }, // Frontend drawing bounds logic
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { type: "string", minLength: 1 },
        type: { type: "string", enum: ["ticket", "certificate"] },
        backgroundImageUrl: { type: "string" },
        elementsJson: { type: ["array", "object"] }, 
      },
    },
    response: {
      201: templateResponseObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getTemplatesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: templateResponseObj,
      },
      500: errorResponseSchema,
    },
  },
};

export const updateTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["templateId"],
      properties: { templateId: { type: "string" } },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        backgroundImageUrl: { type: "string" },
        elementsJson: { type: ["array", "object"] },
      },
      minProperties: 1,
    },
    response: {
      200: templateResponseObj,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["templateId"],
      properties: { templateId: { type: "string" } },
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
