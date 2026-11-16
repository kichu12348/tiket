import type { EmailLog, EmailAnalytics } from "@/types/email";

export function computeEmailMetrics(
  logs: EmailLog[],
  analytics?: EmailAnalytics | null,
): EmailAnalytics {
  if (analytics) return analytics;

  const totalSent = logs.filter((l) => l.status === "sent").length;
  const totalFailed = logs.filter((l) => l.status === "failed").length;
  const totalQueued = logs.filter((l) => l.status === "queued").length;
  const totalOpened = logs.filter(
    (l) => (l.openCount !== undefined && l.openCount > 0) || Boolean(l.openedAt),
  ).length;
  const totalUnopened = logs.filter(
    (l) =>
      l.status === "sent" &&
      (!l.openCount || l.openCount === 0) &&
      !l.openedAt,
  ).length;
  const openRatePercent =
    totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const standardTypes = [
    "confirmation",
    "checkin",
    "invitation",
    "thank_you",
    "sorry",
    "custom",
  ];
  const typesSet = new Set(standardTypes);
  logs.forEach((l) => {
    if (l.templateType) typesSet.add(l.templateType);
  });

  const byType = Array.from(typesSet).map((t) => {
    const typeLogs = logs.filter((l) => (l.templateType || "custom") === t);
    const sent = typeLogs.filter((l) => l.status === "sent").length;
    const opened = typeLogs.filter(
      (l) =>
        (l.openCount !== undefined && l.openCount > 0) || Boolean(l.openedAt),
    ).length;
    const unopened = Math.max(0, sent - opened);
    const failed = typeLogs.filter((l) => l.status === "failed").length;
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    return {
      templateType: t,
      sent,
      opened,
      unopened,
      failed,
      openRatePercent: openRate,
    };
  });

  const timelineMap = new Map<
    string,
    { bucket: string; sent: number; opened: number }
  >();
  for (const log of logs) {
    if (log.sentAt) {
      const bucket = new Date(log.sentAt).toISOString().slice(0, 10);
      const item = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
      if (log.status === "sent") item.sent += 1;
      timelineMap.set(bucket, item);
    }
    if (log.openedAt) {
      const bucket = new Date(log.openedAt).toISOString().slice(0, 10);
      const item = timelineMap.get(bucket) || { bucket, sent: 0, opened: 0 };
      item.opened += 1;
      timelineMap.set(bucket, item);
    }
  }
  const timeline = Array.from(timelineMap.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );

  return {
    totalSent,
    totalFailed,
    totalOpened,
    totalUnopened,
    queuedCount: totalQueued,
    openRatePercent,
    byType,
    timeline,
  };
}
