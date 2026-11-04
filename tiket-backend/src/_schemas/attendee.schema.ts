const errorResponseSchema = {
  type: "object",
  properties: { error: { type: "string" } },
};

const attendeeItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    qrCode: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "string" },
    user: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
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
    order: {
      type: "object",
      properties: {
        id: { type: "string" },
        totalAmount: { type: "string" },
        paymentStatus: { type: "string" },
        createdAt: { type: "string" },
      },
    },
    checkedInAt: { type: ["string", "null"] },
  },
};

export const getAttendeesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    querystring: {
      type: "object",
      properties: {
        search: { type: "string" },
        ticketTypeId: { type: "string" },
        status: { type: "string" },
        paymentStatus: { type: "string" },
        page: { type: "string" },
        limit: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          attendees: {
            type: "array",
            items: attendeeItemSchema,
          },
          total: { type: "number" },
          page: { type: "number" },
          limit: { type: "number" },
          totalPages: { type: "number" },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getAttendeeStatsSchema = {
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
          totalAttendees: { type: "number" },
          checkedInCount: { type: "number" },
          pendingCount: { type: "number" },
          totalRevenue: { type: "number" },
          breakdownByTicketType: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ticketTypeId: { type: "string" },
                ticketTypeName: { type: "string" },
                count: { type: "number" },
                checkedInCount: { type: "number" },
                price: { type: "string" },
              },
            },
          },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getAttendeeByIdSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketId"],
      properties: {
        eventId: { type: "string" },
        ticketId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          attendee: attendeeItemSchema,
          checkIns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                checkedInAt: { type: "string" },
                loggedBy: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getAttendeeFormResponsesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketId"],
      properties: {
        eventId: { type: "string" },
        ticketId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          responses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fieldId: { type: "string" },
                label: { type: "string" },
                fieldType: { type: "string" },
                value: { type: "string" },
              },
            },
          },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const toggleCheckInSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketId"],
      properties: {
        eventId: { type: "string" },
        ticketId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          status: { type: "string" },
          checkedInAt: { type: ["string", "null"] },
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

export const cancelTicketSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId", "ticketId"],
      properties: {
        eventId: { type: "string" },
        ticketId: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          status: { type: "string" },
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

export const manualRegisterSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    body: {
      type: "object",
      required: ["name", "email", "ticketTypeId"],
      properties: {
        name: { type: "string", minLength: 1 },
        email: { type: "string", format: "email" },
        ticketTypeId: { type: "string" },
        notes: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        properties: {
          message: { type: "string" },
          ticket: attendeeItemSchema,
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

export const exportAttendeesSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    querystring: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["csv", "json"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          data: { type: "string" },
          format: { type: "string" },
          filename: { type: "string" },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};

export const getEventInsightsSchema = {
  schema: {
    params: {
      type: "object",
      required: ["eventId"],
      properties: { eventId: { type: "string" } },
    },
    response: {
      200: {
        type: "object",
        required: [
          "summary",
          "dailySeries",
          "hourlyCheckIns",
          "tierBreakdown",
          "recentActivity",
        ],
        properties: {
          summary: {
            type: "object",
            required: [
              "totalRegistrations",
              "confirmedCount",
              "checkedInCount",
              "pendingApprovalCount",
              "cancelledOrDeclinedCount",
              "checkInRatePercent",
              "capacity",
              "remainingCapacity",
              "netRevenuePaise",
              "totalRefundedPaise",
              "couponOrdersCount",
            ],
            properties: {
              totalRegistrations: { type: "number" },
              confirmedCount: { type: "number" },
              checkedInCount: { type: "number" },
              pendingApprovalCount: { type: "number" },
              cancelledOrDeclinedCount: { type: "number" },
              checkInRatePercent: { type: "number" },
              capacity: { type: ["number", "null"] },
              remainingCapacity: { type: ["number", "null"] },
              netRevenuePaise: { type: "number" },
              totalRefundedPaise: { type: "number" },
              couponOrdersCount: { type: "number" },
            },
          },
          dailySeries: {
            type: "array",
            items: {
              type: "object",
              required: ["date", "registrations", "revenuePaise"],
              properties: {
                date: { type: "string" },
                registrations: { type: "number" },
                revenuePaise: { type: "number" },
              },
            },
          },
          hourlyCheckIns: {
            type: "array",
            items: {
              type: "object",
              required: ["hour", "count"],
              properties: {
                hour: { type: "string" },
                count: { type: "number" },
              },
            },
          },
          tierBreakdown: {
            type: "array",
            items: {
              type: "object",
              required: [
                "ticketTypeId",
                "name",
                "sold",
                "capacity",
                "revenuePaise",
                "checkedIn",
              ],
              properties: {
                ticketTypeId: { type: "string" },
                name: { type: "string" },
                sold: { type: "number" },
                capacity: { type: ["number", "null"] },
                revenuePaise: { type: "number" },
                checkedIn: { type: "number" },
              },
            },
          },
          recentActivity: {
            type: "array",
            items: {
              type: "object",
              required: [
                "id",
                "attendeeName",
                "attendeeEmail",
                "ticketTypeName",
                "status",
                "timestamp",
              ],
              properties: {
                id: { type: "string" },
                attendeeName: { type: "string" },
                attendeeEmail: { type: "string" },
                ticketTypeName: { type: "string" },
                status: { type: "string" },
                timestamp: { type: "string" },
              },
            },
          },
        },
      },
      401: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
};
