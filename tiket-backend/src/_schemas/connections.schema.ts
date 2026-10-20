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
      required: ["provider", "fromEmail"],
      properties: {
        ...from,
        provider: { type: "string", enum: ["brevo", "smtp"] },
        apiKey: text,
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
      allOf: [
        {
          if: { properties: { provider: { const: "smtp" } } },
          then: {
            required: ["host", "port", "secure", "username", "password"],
          },
          else: { required: ["apiKey"] },
        },
      ],
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
