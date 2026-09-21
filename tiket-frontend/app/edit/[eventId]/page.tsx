"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditEventRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.eventId) {
      router.replace(`/edit/${params.eventId}/overview`);
    }
  }, [params, router]);

  return null;
}
