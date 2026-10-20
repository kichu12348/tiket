import { cookies } from "next/headers";
import { API_ENDPOINTS, API_URL, TOKEN_KEY } from "@/constants/config";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  const token = (await cookies()).get(TOKEN_KEY)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("eventId" in body) ||
    typeof body.eventId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.eventId)
  )
    return Response.json({ error: "Invalid event ID." }, { status: 400 });
  const response = await fetch(
    `${API_URL}${API_ENDPOINTS.REALTIME.CONNECT(body.eventId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
