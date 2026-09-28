import { createHash, createHmac } from "node:crypto";

type BytePlusResponse = Record<string, unknown> & { readonly Result?: Record<string, unknown> };

export type SeedanceAssetOptions = {
  readonly sourceUrl: string;
  readonly groupId: string;
  readonly projectName: string;
  readonly accessKeyId: string;
  readonly accessKeySecret: string;
  readonly fetch: typeof globalThis.fetch;
  readonly pollIntervalMs?: number;
  readonly timeoutMs?: number;
};

const host = "ark.ap-southeast-1.byteplusapi.com";
const region = "ap-southeast-1";
const service = "ark";
const version = "2024-01-01";

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function hmac(key: string | Buffer, value: string): Buffer { return createHmac("sha256", key).update(value).digest(); }
function first(response: BytePlusResponse, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = response.Result?.[key] ?? response[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

async function postAction(options: SeedanceAssetOptions, action: string, body: Record<string, unknown>): Promise<BytePlusResponse> {
  const bodyText = JSON.stringify(body); const contentHash = sha256(bodyText);
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/gu, "");
  const query = `Action=${encodeURIComponent(action)}&Version=${version}`;
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-content-sha256:${contentHash}\nx-date:${date}\n`;
  const scope = `${date.slice(0, 8)}/${region}/${service}/request`;
  const canonicalRequest = ["POST", "/", query, canonicalHeaders, signedHeaders, contentHash].join("\n");
  const stringToSign = ["HMAC-SHA256", date, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(options.accessKeySecret, date.slice(0, 8)), region), service), "request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const response = await options.fetch(`https://${host}/?${query}`, {
    method: "POST",
    headers: {
      host, "content-type": "application/json", "x-content-sha256": contentHash, "x-date": date,
      authorization: `HMAC-SHA256 Credential=${options.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: bodyText,
    signal: AbortSignal.timeout(options.timeoutMs ?? 600_000),
  });
  const text = await response.text(); let data: unknown;
  try { data = text.length === 0 ? {} : JSON.parse(text); } catch { throw new Error(`BytePlus Ark Asset returned invalid JSON (${response.status})`); }
  if (!response.ok) throw new Error(`BytePlus Ark Asset request failed (${response.status}): ${String((data as { Message?: unknown }).Message ?? text).slice(0, 500)}`);
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error("BytePlus Ark Asset response must be an object");
  return data as BytePlusResponse;
}

function state(response: BytePlusResponse, fallbackId?: string): { readonly id: string; readonly status: string; readonly error?: unknown } {
  const id = first(response, "Id", "AssetId") ?? fallbackId; const status = first(response, "Status");
  if (typeof id !== "string" || id.length === 0) throw new Error("BytePlus Ark Asset response has no asset id");
  return { id, status: typeof status === "string" ? status : "", error: first(response, "Error", "ErrMsg") };
}

export async function prepareSeedanceAsset(options: SeedanceAssetOptions): Promise<string> {
  if (!/^https?:\/\//iu.test(options.sourceUrl)) throw new Error("BytePlus Ark Asset source URL must use HTTP or HTTPS");
  const created = state(await postAction(options, "CreateAsset", {
    GroupId: options.groupId, URL: options.sourceUrl, AssetType: "Image", ProjectName: options.projectName,
  }));
  const deadline = Date.now() + (options.timeoutMs ?? 600_000); let current = created;
  while (current.status !== "Active") {
    if (current.status === "Failed") throw new Error(`BytePlus Ark Asset rejected the image${current.error === undefined ? "" : `: ${JSON.stringify(current.error)}`}`);
    if (Date.now() >= deadline) throw new Error("BytePlus Ark Asset review timed out");
    await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs ?? 3_000));
    current = state(await postAction(options, "GetAsset", { Id: created.id, ProjectName: options.projectName }), created.id);
  }
  return `asset://${created.id}`;
}
