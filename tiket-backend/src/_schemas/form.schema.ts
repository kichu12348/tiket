const fieldTypes = [
  "text",
  "long_text",
  "email",
  "phone",
  "number",
  "single_select",
  "multi_select",
  "date",
  "datetime",
  "time",
  "rating",
  "url",
] as const;

const visibilityConditionRuleSchema = {
  type: "object",
  required: ["fieldId", "allowedValues"],
  properties: {
    fieldId: { type: "string" },
    operator: {
      type: "string",
      enum: ["equals", "not_equals", "in"],
    },
    allowedValues: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const visibilityConditionsConfigSchema = {
  type: "object",
  required: ["rules"],
  properties: {
    match: { type: "string", enum: ["all", "any"] },
    rules: {
      type: "array",
      items: visibilityConditionRuleSchema,
    },
  },
};

const conditionRuleSchema = {
  type: "object",
  required: ["sourceType", "sourceId", "operator", "value"],
  properties: {
    sourceType: { type: "string", enum: ["field", "ticketType"] },
    sourceId: { type: "string" },
    operator: {
      type: "string",
      enum: ["equals", "not_equals", "contains", "in"],
    },
    value: {
      anyOf: [
        { type: "string" },
        { type: "array", items: { type: "string" } },
      ],
    },
  },
};

const fieldConditionConfigSchema = {
  type: "object",
  required: ["match", "rules", "thenAction", "elseAction"],
  properties: {
    match: { type: "string", enum: ["all", "any"] },
    rules: {
      type: "array",
      items: conditionRuleSchema,
    },
    thenAction: { type: "string", enum: ["show", "require", "hide"] },
    elseAction: { type: "string", enum: ["hide", "optional", "show"] },
  },
};

const visibilityConditionsSchema = {
  anyOf: [
    { type: "array", items: visibilityConditionRuleSchema },
    visibilityConditionsConfigSchema,
    fieldConditionConfigSchema,
    { type: "null" },
  ],
};

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
    isLocked: { type: "boolean" },
    options: {
      anyOf: [
        { type: "array", items: { type: "string" } },
        {
          type: "object",
          properties: {
            choices: { type: "array", items: { type: "string" } },
            min: { type: ["integer", "null"] },
            max: { type: ["integer", "null"] },
            allowCustom: { type: ["boolean", "null"] },
            isMulti: { type: ["boolean", "null"] },
            conditions: visibilityConditionsSchema,
          },
        },
        { type: "null" },
      ],
    },
    conditions: visibilityConditionsSchema,
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
    isLocked: { type: "boolean" },
        options: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            {
              type: "object",
              properties: {
                choices: { type: "array", items: { type: "string" } },
                min: { type: ["integer", "null"] },
                max: { type: ["integer", "null"] },
                allowCustom: { type: ["boolean", "null"] },
                isMulti: { type: ["boolean", "null"] },
                conditions: visibilityConditionsSchema,
              },
            },
            { type: "null" },
          ],
        },
        conditions: visibilityConditionsSchema,
        sortOrder: { type: "integer" },
        page: { type: "integer" },
      },
    },
    response: {
      201: formFieldObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
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
    isLocked: { type: "boolean" },
        options: {
          anyOf: [
            { type: "array", items: { type: "string" } },
            {
              type: "object",
              properties: {
                choices: { type: "array", items: { type: "string" } },
                min: { type: ["integer", "null"] },
                max: { type: ["integer", "null"] },
                allowCustom: { type: ["boolean", "null"] },
                isMulti: { type: ["boolean", "null"] },
                conditions: visibilityConditionsSchema,
              },
            },
            { type: "null" },
          ],
        },
        conditions: visibilityConditionsSchema,
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

export const replaceFormFieldsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      anyOf: [
        {
          type: "array",
          items: formFieldObj,
        },
        {
          type: "object",
          required: ["fields"],
          properties: {
            fields: {
              type: "array",
              items: formFieldObj,
            },
          },
        },
      ],
    },
    response: {
      200: {
        type: "array",
        items: formFieldObj,
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
