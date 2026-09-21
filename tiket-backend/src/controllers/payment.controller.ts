import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyOrderPayment, processWebhookEvent } from "../services/payment.service";

interface VerifyPaymentBody {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const verifyPayment = async (
  request: FastifyRequest<{ Body: VerifyPaymentBody }>,
  reply: FastifyReply
) => {
  try {
    await request.jwtVerify();
    const user = request.user as { id: string };
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      request.body;

    const result = await verifyOrderPayment({
      orderId,
      userId: user.id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!result.success) {
      return reply.status(result.statusCode || 400).send({ error: result.error });
    }

    return reply.send({
      message: "Payment verified successfully.",
      order: result.order,
    });
  } catch (error) {
    if (
      (error as Error).message?.includes("jwt") ||
      (error as Error).message?.includes("Authorization")
    ) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const handleWebhook = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const signature = request.headers["x-razorpay-signature"] as string;
    const rawBody =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);

    const result = await processWebhookEvent({ rawBody, signature });

    if (!result.success) {
      return reply.status(result.statusCode || 400).send({ error: result.error });
    }

    return reply.send({ status: "ok" });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
