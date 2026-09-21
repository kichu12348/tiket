export const cdnGenerateUrlSchema = {
  schema: {
    body: {
      type: "object",
      required: ["filename", "contentType"],
      properties: {
        filename: { type: "string" },
        contentType: {
          type: "string",
          enum: ["jpeg", "png", "webp", "svg", "ico", "avif", "jpg"],
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          url: { type: "string" },
          max_size: { type: "number" },
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
