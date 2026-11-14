import { eventParams } from "./commerce.schema";
const text = { type: "string", minLength: 1, maxLength: 1000 };
const from = {
  fromEmail: { type: "string", format: "email" },
  fromName: { type: "string", maxLength: 120 },
};
export const mailConfigSchema = {
  schema: {
    params: eventParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: [
        "fromEmail",
        "host",
        "port",
        "secure",
        "username",
        "password",
      ],
      properties: {
        ...from,
        provider: { type: "string", enum: ["smtp"], default: "smtp" },
        host: {
          type: "string",
          pattern: "^[a-zA-Z0-9][a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          maxLength: 253,
        },
        port: { type: "integer", enum: [465, 587, 2525] },
        secure: { type: "boolean" },
        username: text,
        password: text,
      },
    },
  },
};
export const testMailSchema = {
  schema: {
    params: eventParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["testRecipient"],
      properties: {
        testRecipient: { type: "string", format: "email" },
      },
    },
  },
};
export const uploadSchema = {
  schema: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["eventId", "fieldId", "filename", "contentType", "size"],
      properties: {
        eventId: { type: "string", format: "uuid" },
        fieldId: { type: "string", format: "uuid" },
        filename: { type: "string", minLength: 1, maxLength: 255 },
        contentType: { type: "string", maxLength: 120 },
        size: { type: "integer", minimum: 1, maximum: 10485760 },
      },
    },
  },
};
export const uploadParamsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["uploadId"],
      properties: { uploadId: { type: "string", format: "uuid" } },
    },
  },
};
