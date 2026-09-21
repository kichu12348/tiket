const fieldTypes = [
  "text",
  "long_text",
  "email",
  "phone",
  "number",
  "single_select",
  "multi_select",
  "radio",
  "checkbox",
  "date",
  "datetime",
  "time",
  "rating",
  "url",
  "select",
] as const;

const formFieldObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    name: { type: "string" },
    label: { type: "string" },
    fieldType: {
      type: "string",
      enum: fieldTypes,
    },
    isRequired: { type: "boolean" },
    options: {
      anyOf: [
        { type: "array", items: { type: "string" } },
        {
          type: "object",
          properties: {
            choices: { type: "array", items: { type: "string" } },
            min: { type: ["integer", "null"] },
            max: { type: ["integer", "null"] },
          },
        },
        { type: "null" },
      ],
    },
    sortOrder: { type: "integer" },
    page: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createFieldSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name", "label", "fieldType"],
      properties: {
        name: { type: "string", minLength: 1 },
        label: { type: "string", minLength: 1 },
        fieldType: {
          type: "string",
          enum: fieldTypes,
        },
        isRequired: { type: "boolean" },
        options: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            {
              type: "object",
              properties: {
                choices: { type: "array", items: { type: "string" } },
                min: { type: ["integer", "null"] },
                max: { type: ["integer", "null"] },
              },
            },
            { type: "null" },
          ],
        },
        sortOrder: { type: "integer" },
        page: { type: "integer" },
      },
    },
    response: {
      201: formFieldObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getFieldsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: formFieldObj,
      },
      500: errorResponseSchema,
    },
  },
};

export const updateFieldSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "fieldId"],
      properties: {
        eventId: { type: "string" },
        fieldId: { type: "string" },
      },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        label: { type: "string", minLength: 1 },
        fieldType: {
          type: "string",
          enum: fieldTypes,
        },
        isRequired: { type: "boolean" },
        options: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            {
              type: "object",
              properties: {
                choices: { type: "array", items: { type: "string" } },
                min: { type: ["integer", "null"] },
                max: { type: ["integer", "null"] },
              },
            },
            { type: "null" },
          ],
        },
        sortOrder: { type: "integer" },
        page: { type: "integer" },
      },
      minProperties: 1,
    },
    response: {
      200: formFieldObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteFieldSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "fieldId"],
      properties: {
        eventId: { type: "string" },
        fieldId: { type: "string" },
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

export const deletePageSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "pageNum"],
      properties: {
        eventId: { type: "string" },
        pageNum: { type: "number" },
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
