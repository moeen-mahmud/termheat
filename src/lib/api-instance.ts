// Thin HTTP layer: shared defaults only. It deliberately returns the raw
// Response instead of throwing on non-2xx — status codes are semantic here
// (404 = unknown user, 401 = bad token), so mapping them to domain errors is
// the caller's job, not the transport's. Body decoding stays with the caller
// too: the GraphQL transport reads .json(), the HTML calendar reads .text().

const DEFAULT_HEADERS = { "user-agent": "termheat" };

export const apiInstance = {
  get(url: string, headers: Record<string, string> = {}): Promise<Response> {
    return fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers } });
  },

  post(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: { ...DEFAULT_HEADERS, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  },
};
