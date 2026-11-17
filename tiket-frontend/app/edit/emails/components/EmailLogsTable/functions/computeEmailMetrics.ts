import type {
  EmailLog,
  EmailAnalytics,
  OpenTimeBucketItem,
} from "@/types/email";

export function computeOpenTimeDistribution(
  logs: EmailLog[],
): OpenTimeBucketItem[] {
  let within5m = 0;
  let within30m = 0;
  let within2h = 0;
  let after2h = 0;

  let totalOpened = 0;

  for (const log of logs) {
    const isOpened =
      (log.openCount !== undefined && log.openCount > 0) || Boolean(log.openedAt);
    if (!isOpened) continue;

    totalOpened += 1;
    if (log.sentAt && log.openedAt) {
      const diffMs =
        new Date(log.openedAt).getTime() - new Date(log.sentAt).getTime();
      const diffMinutes = Math.max(0, diffMs / (1000 * 60));

      if (diffMinutes <= 5) {
        within5m += 1;
      } else if (diffMinutes <= 30) {
        within30m += 1;
      } else if (diffMinutes <= 120) {
        within2h += 1;
      } else {
        after2h += 1;
      }
    } else {
      after2h += 1;
    }
  }

  const calcPercent = (count: number) =>
    totalOpened > 0 ? Math.round((count / totalOpened) * 100) : 0;

  return [
    {
      bucket: "Within 5 min",
      count: within5m,
      percentage: calcPercent(within5m),
    },
    {
      bucket: "Within 30 min",
      count: within30m,
      percentage: calcPercent(within30m),
    },
    {
      bucket: "Within 2 hr",
      count: within2h,
      percentage: calcPercent(within2h),
    },
    {
      bucket: "After 2 hr",
      count: after2h,
      percentage: calcPercent(after2h),
    },
  ];
}

export function computeEmailMetrics(
  logs: EmailLog[],
  analytics?: EmailAnalytics | null,
): EmailAnalytics {
  const openTimeDistribution =
    analytics?.openTimeDistribution ?? computeOpenTimeDistribution(logs);

  if (analytics) {
    return {
      ...analytics,
      openTimeDistribution,
    };
  }

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
    openTimeDistribution,
  };
}
