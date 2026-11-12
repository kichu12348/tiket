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

const visibilityConditionsSchema = {
  anyOf: [
    { type: "array", items: visibilityConditionRuleSchema },
    visibilityConditionsConfigSchema,
    { type: "null" },
  ],
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

const conditionGroupSchema = {
  type: "object",
  required: ["match", "rules"],
  properties: {
    match: { type: "string", enum: ["all", "any"] },
    rules: {
      type: "array",
      items: conditionRuleSchema,
    },
  },
};

const ticketLayoutLayerSchema = {
  type: "object",
  required: [
    "id",
    "type",
    "name",
    "tokenOrText",
    "x",
    "y",
    "width",
    "height",
    "fontSize",
    "maxLines",
    "lineSpacing",
    "fontColor",
  ],
  properties: {
    id: { type: "string" },
    type: { type: "string", enum: ["qr", "text"] },
    name: { type: "string" },
    tokenOrText: { type: "string" },
    x: { type: "number" },
    y: { type: "number" },
    width: { type: "number" },
    height: { type: "number" },
    rotation: { type: "number" },
    fontSize: { type: "number" },
    maxLines: { type: "number" },
    lineSpacing: { type: "number" },
    fontColor: { type: "string" },
    fontWeight: { type: "string" },
    fontFamily: { type: "string" },
    fontStyle: { type: "string" },
    textDecoration: { type: "string" },
    qrColor: { type: "string" },
    qrBgColor: { type: "string" },
  },
};

const ticketLayoutConfigSchema = {
  type: "object",
  required: ["canvasWidth", "canvasHeight", "layers"],
  properties: {
    canvasWidth: { type: "number" },
    canvasHeight: { type: "number" },
    layers: {
      type: "array",
      items: ticketLayoutLayerSchema,
    },
  },
};

const ticketTypeObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    isHidden: { type: "boolean" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    price: { type: "string" },
    templateImageUrl: { type: ["string", "null"] },
    templateConfig: {
      anyOf: [ticketLayoutConfigSchema, { type: "null" }],
    },
    passFeeToCustomer: { type: "boolean" },
    quantityLimit: { type: ["integer", "null"], minimum: 1 },
    poolName: { type: ["string", "null"] },
    poolCapacity: { type: ["integer", "null"], minimum: 1 },
    category: { type: ["string", "null"] },
    tags: { type: "array", items: { type: "string" } },
    enableWaitlist: { type: "boolean" },
    multiDayCheckIn: { type: "boolean" },
    maxCheckInsPerDay: { type: ["integer", "null"], minimum: 1 },
    codePrefix: {
      type: "string",
      maxLength: 20,
      pattern: "^[A-Za-z0-9_-]*$",
    },
    codeLength: { type: "integer", minimum: 4, maximum: 12 },
    maxPerUser: { type: ["integer", "null"], minimum: 1 },
    isFixedDefault: { type: "boolean" },
    collectGst: { type: "boolean" },
    isClosed: { type: "boolean" },
    conditions: visibilityConditionsSchema,
    eligibilityRules: {
      anyOf: [conditionGroupSchema, { type: "null" }],
    },
    saleStart: { type: ["string", "null"], format: "date-time" },
    saleEnd: { type: ["string", "null"], format: "date-time" },
    isRefundable: { type: "boolean" },
    refundableUntil: { type: ["string", "null"], format: "date-time" },
    isTransferable: { type: "boolean" },
    maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
    sortOrder: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const createTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name"],
      properties: {
        isHidden: { type: "boolean" },
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number", minimum: 0, maximum: 10000000 },
        templateImageUrl: { type: ["string", "null"] },
        templateConfig: {
          anyOf: [ticketLayoutConfigSchema, { type: "null" }],
        },
        passFeeToCustomer: { type: "boolean" },
        quantityLimit: { type: ["integer", "null"], minimum: 1 },
        poolName: { type: ["string", "null"] },
        poolCapacity: { type: ["integer", "null"], minimum: 1 },
        category: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        enableWaitlist: { type: "boolean" },
        multiDayCheckIn: { type: "boolean" },
        maxCheckInsPerDay: { type: ["integer", "null"], minimum: 1 },
        codePrefix: {
          type: "string",
          maxLength: 20,
          pattern: "^[A-Za-z0-9_-]*$",
        },
        codeLength: { type: "integer", minimum: 4, maximum: 12 },
        maxPerUser: { type: ["integer", "null"], minimum: 1 },
        isFixedDefault: { type: "boolean" },
        collectGst: { type: "boolean" },
        isClosed: { type: "boolean" },
        conditions: visibilityConditionsSchema,
        eligibilityRules: {
          anyOf: [conditionGroupSchema, { type: "null" }],
        },
        saleStart: { type: "string", format: "date-time" },
        saleEnd: { type: "string", format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: "string", format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    response: {
      201: ticketTypeObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getTicketTypesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: ticketTypeObj,
      },
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const updateTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketTypeId"],
      properties: {
        eventId: { type: "string" },
        ticketTypeId: { type: "string" },
      },
    },
    body: {
      type: "object",
      properties: {
        isHidden: { type: "boolean" },
        name: { type: "string", minLength: 2 },
        description: { type: "string" },
        price: { type: "number", minimum: 0, maximum: 10000000 },
        templateImageUrl: { type: ["string", "null"] },
        templateConfig: {
          anyOf: [ticketLayoutConfigSchema, { type: "null" }],
        },
        passFeeToCustomer: { type: "boolean" },
        quantityLimit: { type: ["integer", "null"], minimum: 1 },
        poolName: { type: ["string", "null"] },
        poolCapacity: { type: ["integer", "null"], minimum: 1 },
        category: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        enableWaitlist: { type: "boolean" },
        multiDayCheckIn: { type: "boolean" },
        maxCheckInsPerDay: { type: ["integer", "null"], minimum: 1 },
        codePrefix: {
          type: "string",
          maxLength: 20,
          pattern: "^[A-Za-z0-9_-]*$",
        },
        codeLength: { type: "integer", minimum: 4, maximum: 12 },
        maxPerUser: { type: ["integer", "null"], minimum: 1 },
        isFixedDefault: { type: "boolean" },
        collectGst: { type: "boolean" },
        isClosed: { type: "boolean" },
        conditions: visibilityConditionsSchema,
        eligibilityRules: {
          anyOf: [conditionGroupSchema, { type: "null" }],
        },
        saleStart: { type: ["string", "null"], format: "date-time" },
        saleEnd: { type: ["string", "null"], format: "date-time" },
        isRefundable: { type: "boolean" },
        refundableUntil: { type: ["string", "null"], format: "date-time" },
        isTransferable: { type: "boolean" },
        maxTransfers: { type: "integer", minimum: 0, maximum: 100 },
      },
      minProperties: 1,
    },
    response: {
      200: ticketTypeObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteTicketTypeSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketTypeId"],
      properties: {
        eventId: { type: "string" },
        ticketTypeId: { type: "string" },
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

export const reorderTicketTypesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "sortOrder"],
        properties: {
          id: { type: "string" },
          sortOrder: { type: "integer" },
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: { message: { type: "string" } },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
