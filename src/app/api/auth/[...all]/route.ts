import { toNextJsHandler } from "better-auth/next-js";

import { frontendOnlyApiResponse, isFrontendOnly } from "@/lib/runtime-mode";

async function liveHandlers() {
  const { getAuth } = await import("@/lib/auth");
  return toNextJsHandler(getAuth());
}

export async function GET(request: Request) {
  if (isFrontendOnly()) return frontendOnlyApiResponse();
  return (await liveHandlers()).GET(request);
}

export async function POST(request: Request) {
  if (isFrontendOnly()) return frontendOnlyApiResponse();
  return (await liveHandlers()).POST(request);
}
