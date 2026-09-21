import { useEffect, useState } from "react";
import { getTicketPass } from "@/api/tickets";
import { TicketPassData } from "@/types/ticket";

export function useTicketPass(ticketId: string | undefined) {
  const [ticket, setTicket] = useState<TicketPassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function fetchTicket() {
      if (!ticketId) return;

      setIsLoading(true);
      setError(null);
      setStatusCode(undefined);

      try {
        const data = await getTicketPass(ticketId);
        if (data && data.id) {
          setTicket(data);
        } else {
          setError("Ticket pass not found.");
          setStatusCode(404);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load ticket pass.";

        setStatusCode(status);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTicket();
  }, [ticketId]);

  return { ticket, isLoading, error, statusCode };
}
