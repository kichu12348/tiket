import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { useCallback, useEffect, useState } from "react";
import { getTicketPass } from "@/api/tickets";
import type { TicketPassData } from "@/types/ticket";

export function useTicketPass(ticketId: string | undefined) {
  const [ticket, setTicket] = useState<TicketPassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const isMissingId = !ticketId;

  useEffect(() => {
    if (!ticketId) return;

    let ignore = false;

    async function loadTicket() {
      try {
        const data = await getTicketPass(ticketId as string);
        if (ignore) return;
        if (data && data.id) {
          setTicket(data);
          setError(null);
          setStatusCode(undefined);
        } else {
          setError("Ticket pass not found.");
          setStatusCode(404);
        }
      } catch (err: unknown) {
        if (ignore) return;
        const status = getErrorStatus(err);
        let message = getErrorMessage(err);

        if (status === 401) {
          message = message || "Please sign in to view this ticket pass.";
        } else if (status === 403) {
          message =
            message || "You do not have permission to view this ticket pass.";
        } else if (status === 404) {
          message = message || "Ticket pass not found.";
        } else {
          message = message || "Failed to load ticket pass.";
        }

        setStatusCode(status);
        setError(message);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadTicket();

    return () => {
      ignore = true;
    };
  }, [ticketId, refreshTrigger]);

  return {
    ticket,
    isLoading: isMissingId ? false : isLoading,
    error: isMissingId ? "Ticket pass ID is missing." : error,
    statusCode: isMissingId ? 404 : statusCode,
    setTicket,
    refetch,
  };
}


