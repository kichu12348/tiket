export const cdnGenerateUrlSchema = {
  schema: {
    body: {
      type: "object",
      required: ["filename", "contentType"],
      properties: {
        filename: { type: "string" },
        contentType: {
          type: "string",
          enum: [
            "jpeg",
            "png",
            "webp",
            "svg",
            "ico",
            "avif",
            "jpg",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/svg+xml",
            "image/x-icon",
            "image/avif",
          ],
        },
        eventId: { type: "string" },
        objType: {
          type: "string",
          enum: ["banner", "ticket-template", "email", "form-file"],
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          url: { type: "string" },
          max_size: { type: "number" },
          filename: { type: "string" },
          fileUrl: { type: "string" },
          key: { type: "string" },
        },
      },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      401: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      500: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
};
