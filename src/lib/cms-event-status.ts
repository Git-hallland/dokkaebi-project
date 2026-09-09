export const CMS_EVENT_STATUSES = ["ONGOING", "ENDED"] as const;
export type CmsEventStatus = (typeof CMS_EVENT_STATUSES)[number];

export const CMS_EVENT_STATUS_LABELS: Record<CmsEventStatus, string> = {
  ENDED: "종료",
  ONGOING: "진행중",
};

export function resolveCmsEventStatus(status: CmsEventStatus | null | undefined): CmsEventStatus {
  return status === "ENDED" ? "ENDED" : "ONGOING";
}

type EventContent = Readonly<{
  eventStatus: CmsEventStatus | null;
  id: string;
  publishedAt: Date | null;
  updatedAt: Date;
}>;

export function sortEventContents<T extends EventContent>(contents: readonly T[], direction: "asc" | "desc" = "desc") {
  return [...contents].sort((left, right) => {
    const statusDifference = Number(resolveCmsEventStatus(left.eventStatus) === "ENDED") - Number(resolveCmsEventStatus(right.eventStatus) === "ENDED");
    if (statusDifference) return statusDifference;
    const leftTime = (left.publishedAt ?? left.updatedAt).valueOf();
    const rightTime = (right.publishedAt ?? right.updatedAt).valueOf();
    const timeDifference = direction === "desc" ? rightTime - leftTime : leftTime - rightTime;
    return timeDifference || left.id.localeCompare(right.id);
  });
}
