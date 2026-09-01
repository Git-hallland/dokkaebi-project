"use client";

import { useEffect, useRef, useState } from "react";

export function CommunityViewCount({ initialViewCount, postId }: Readonly<{ initialViewCount: number; postId: string }>) {
  const [viewCount, setViewCount] = useState(initialViewCount);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void fetch(`/api/community/posts/${postId}/view`, { method: "POST" }).then(async (response) => {
      if (response.ok) setViewCount(((await response.json()) as { viewCount: number }).viewCount);
    });
  }, [postId]);

  return <span aria-label={`조회수 ${viewCount}회`}>조회 {viewCount}</span>;
}
