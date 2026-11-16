// Mobile bridge: intercepts nuvo-core://local requests in browser/webview
// and delegates to localCore so Nuvo's real UI renders beautifully and all data persists.

import { handleLocalCoreRequest } from "./data/core/localCore";

export { SAMPLE_MIXES } from "./data/demo/mixes";

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.startsWith("nuvo-core://") || url.startsWith("http://nuvo-core")) {
    return handleLocalCoreRequest(url, init);
  }

  return originalFetch(input, init);
};

export {};
