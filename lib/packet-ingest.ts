const MAX_JSON_CHARS = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function ensureJsonSize(input: string): void {
  if (input.length > MAX_JSON_CHARS) {
    throw new Error(`JSON payload is too large (${input.length} chars). Limit is ${MAX_JSON_CHARS}.`);
  }
}

export function parseJsonPayload(text: string): unknown {
  ensureJsonSize(text);
  return JSON.parse(text);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return parseJsonPayload(text);
}

export async function fetchJsonFromUrl(urlText: string): Promise<unknown> {
  const url = new URL(urlText);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status} ${response.statusText}`.trim());
    }

    const text = await response.text();
    return parseJsonPayload(text);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`);
    }
    throw new Error(getErrorMessage(error));
  } finally {
    clearTimeout(timeoutId);
  }
}

