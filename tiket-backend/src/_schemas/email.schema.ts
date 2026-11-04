const emailTemplateTypes = [
  "invitation",
  "confirmation",
  "checkin",
  "thank_you",
  "sorry",
  "custom",
] as const;

const emailTemplateObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    name: { type: "string" },
    type: { type: "string", enum: emailTemplateTypes },
    subject: { type: "string" },
    body: { type: "string" },
    isActive: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const emailTemplateHeaderObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    name: { type: "string" },
    type: { type: "string", enum: emailTemplateTypes },
    subject: { type: ["string", "null"] },
    body: { type: ["string", "null"] },
    isActive: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

const emailLogObj = {
  type: "object",
  properties: {
    id: { type: "string" },
    eventId: { type: "string" },
    templateId: { type: ["string", "null"] },
    templateType: { type: "string" },
    recipientEmail: { type: "string" },
    recipientName: { type: ["string", "null"] },
    subject: { type: "string" },
    renderedBody: { type: ["string", "null"] },
    status: { type: "string" },
    errorMessage: { type: ["string", "null"] },
    openedAt: { type: ["string", "null"] },
    openCount: { type: "number" },
    resentCount: { type: "number" },
    lastResentAt: { type: ["string", "null"] },
    sentAt: { type: "string" },
  },
};

const emailAnalyticsObj = {
  type: "object",
  properties: {
    totalSent: { type: "number" },
    totalFailed: { type: "number" },
    totalOpened: { type: "number" },
    totalUnopened: { type: "number" },
    openRatePercent: { type: "number" },
    byType: {
      type: "array",
      items: {
        type: "object",
        properties: {
          templateType: { type: "string" },
          sent: { type: "number" },
          opened: { type: "number" },
          unopened: { type: "number" },
          failed: { type: "number" },
          openRatePercent: { type: "number" },
        },
      },
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          bucket: { type: "string" },
          sent: { type: "number" },
          opened: { type: "number" },
        },
      },
    },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const getEmailTemplatesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "array",
        items: emailTemplateHeaderObj,
      },
      500: errorResponseSchema,
    },
  },
};

export const getEmailTemplateByIdSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "templateId"],
      properties: {
        eventId: { type: "string" },
        templateId: { type: "string" },
      },
    },
    response: {
      200: emailTemplateObj,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const createEmailTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name", "subject", "body"],
      properties: {
        name: { type: "string", minLength: 1 },
        type: { type: "string", enum: emailTemplateTypes },
        subject: { type: "string", minLength: 1 },
        body: { type: "string", minLength: 1 },
        isActive: { type: "boolean" },
      },
    },
    response: {
      201: emailTemplateObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const updateEmailTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "templateId"],
      properties: {
        eventId: { type: "string" },
        templateId: { type: "string" },
      },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        type: { type: "string", enum: emailTemplateTypes },
        subject: { type: "string", minLength: 1 },
        body: { type: "string", minLength: 1 },
        isActive: { type: "boolean" },
      },
      minProperties: 1,
    },
    response: {
      200: emailTemplateObj,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const deleteEmailTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "templateId"],
      properties: {
        eventId: { type: "string" },
        templateId: { type: "string" },
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

export const resetEmailTemplateSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "templateId"],
      properties: {
        eventId: { type: "string" },
        templateId: { type: "string" },
      },
    },
    response: {
      200: emailTemplateObj,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getVariablesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          eventVariables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                sample: { type: "string" },
              },
            },
          },
          attendeeVariables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                sample: { type: "string" },
              },
            },
          },
          ticketVariables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                sample: { type: "string" },
              },
            },
          },
          formVariables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                sample: { type: "string" },
              },
            },
          },
        },
      },
      500: errorResponseSchema,
    },
  },
};

export const sendTestEmailSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["recipientEmail", "subject", "body"],
      properties: {
        recipientEmail: { type: "string", format: "email" },
        recipientName: { type: "string" },
        subject: { type: "string", minLength: 1 },
        body: { type: "string", minLength: 1 },
        templateId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          log: emailLogObj,
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const sendBatchEmailSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["targetGroup", "subject", "body"],
      properties: {
        targetGroup: {
          type: "string",
          enum: ["all", "checked_in", "not_checked_in", "custom"],
        },
        customEmails: {
          type: "array",
          items: { type: "string" },
        },
        subject: { type: "string", minLength: 1 },
        body: { type: "string", minLength: 1 },
        templateId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          sentCount: { type: "number" },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEmailLogsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        anyOf: [
          {
            type: "object",
            properties: {
              logs: {
                type: "array",
                items: emailLogObj,
              },
              analytics: emailAnalyticsObj,
            },
          },
          {
            type: "array",
            items: emailLogObj,
          },
        ],
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const resendEmailLogSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "logId"],
      properties: {
        eventId: { type: "string" },
        logId: { type: "string" },
      },
    },
    response: {
      200: emailLogObj,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const trackEmailOpenSchema = {
  schema: {
    params: {
      type: "object",
      required: ["logId"],
      properties: {
        logId: { type: "string" },
      },
    },
  },
};
