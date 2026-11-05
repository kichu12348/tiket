const locationDetailsSchema = {
  type: ["object", "null"],
  properties: {
    name: { type: ["string", "null"] },
    address: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    state: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    placeId: { type: ["string", "null"] },
    lat: { type: ["number", "null"] },
    lng: { type: ["number", "null"] },
    link: { type: ["string", "null"] },
  },
  additionalProperties: true,
};

const ticketPassResponseSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    qrCode: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "string" },
    event: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        slug: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: ["string", "null"] },
        locationType: { type: "string" },
        locationDetails: locationDetailsSchema,
        timezone: { type: "string" },
        coverImage: { type: ["string", "null"] },
      },
    },
    ticketType: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        price: { type: "string" },
        description: { type: ["string", "null"] },
        isTransferable: { type: "boolean" },
        isRefundable: { type: "boolean" },
        templateImageUrl: { type: ["string", "null"] },
        templateConfig: {
          type: ["object", "null"],
          additionalProperties: true,
        },
      },
    },
    attendee: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
      },
    },
    order: {
      type: "object",
      properties: {
        id: { type: "string" },
        totalAmount: { type: "string" },
        paymentStatus: { type: "string" },
        createdAt: { type: "string" },
      },
    },
    responses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: ["string", "null"] },
        },
      },
    },
    template: {
      type: ["object", "null"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        backgroundImageUrl: { type: ["string", "null"] },
        elementsJson: { type: ["array", "object", "null"] },
      },
    },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

export const getTicketPassSchema = {
  schema: {
    params: {
      type: "object",
      required: ["ticketId"],
      properties: {
        ticketId: { type: "string" },
      },
    },
    response: {
      200: ticketPassResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const initiateTransferSchema = {
  schema: {
    params: {
      type: "object",
      required: ["ticketId"],
      properties: { ticketId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["targetEmail"],
      properties: {
        targetEmail: { type: "string", format: "email" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "string" },
          ticketId: { type: "string" },
          fromUserId: { type: "string" },
          toUserId: { type: "string" },
          status: { type: "string" },
          createdAt: { type: "string" },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const acceptTransferSchema = {
  schema: {
    params: {
      type: "object",
      required: ["transferId"],
      properties: { transferId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          transfer: {
            type: "object",
            properties: {
              id: { type: "string" },
              ticketId: { type: "string" },
              fromUserId: { type: "string" },
              toUserId: { type: "string" },
              status: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getMyTicketsSchema = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          tickets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                qrCode: { type: "string" },
                status: { type: "string" },
                createdAt: { type: "string" },
                event: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    slug: { type: "string" },
                    startDate: { type: "string" },
                    endDate: { type: ["string", "null"] },
                    locationType: { type: "string" },
                    coverImage: { type: ["string", "null"] },
                  },
                },
                ticketType: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    price: { type: "string" },
                  },
                },
              },
            },
          },
          incomingTransfers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                ticketId: { type: "string" },
                status: { type: "string" },
                createdAt: { type: "string" },
                ticket: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: { type: "string" },
                  },
                },
                event: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    slug: { type: "string" },
                  },
                },
                sender: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
          outgoingTransfers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                ticketId: { type: "string" },
                toUserId: { type: "string" },
                status: { type: "string" },
                createdAt: { type: "string" },
                recipient: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const cancelTicketSchema = {
  schema: {
    params: {
      type: "object",
      required: ["ticketId"],
      properties: { ticketId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          ticketId: { type: "string" },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const cancelTransferSchema = {
  schema: {
    params: {
      type: "object",
      required: ["transferId"],
      properties: { transferId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          transfer: {
            type: "object",
            properties: {
              id: { type: "string" },
              ticketId: { type: "string" },
              fromUserId: { type: "string" },
              toUserId: { type: "string" },
              status: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
