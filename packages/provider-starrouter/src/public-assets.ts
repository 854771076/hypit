import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { EndpointCredential } from "@hypit/endpoint-kit";
import type { BlobRef } from "@hypit/protocol";
import type { CredentialRef, ResourceStore } from "@hypit/runtime";

export type StarRouterPublicAssets = {
  readonly bucket: string;
  readonly publicBaseUrl: string;
  readonly prefix?: string;
  readonly region?: string;
  readonly endpoint?: string;
  readonly forcePathStyle?: boolean;
  readonly accessKeyId: CredentialRef;
  readonly secretAccessKey: CredentialRef;
  readonly sessionToken?: CredentialRef;
};

function required(credentials: Readonly<Record<string, EndpointCredential>>, name: string): string {
  const value = credentials[name]?.secret;
  if (typeof value !== "string" || value.length === 0) throw new Error(`StarRouter ${name} credential is unavailable`);
  return value;
}

function normalizedPrefix(value: string | undefined): string {
  if (value === undefined) return "";
  const prefix = value.replace(/^\/+|\/+$/gu, "");
  if (prefix.length === 0 || prefix.split("/").some((part) => part === "." || part === "..")) throw new Error("StarRouter public asset prefix is invalid");
  return prefix;
}

export function createStarRouterPublicAssetPublisher(
  config: StarRouterPublicAssets,
  credentials: Readonly<Record<string, EndpointCredential>>,
): (artifact: BlobRef, resources: ResourceStore) => Promise<string> {
  const sessionToken = config.sessionToken === undefined ? undefined : required(credentials, "publicAssetSessionToken");
  const client = new S3Client({
    ...(config.region === undefined ? {} : { region: config.region }),
    ...(config.endpoint === undefined ? {} : { endpoint: config.endpoint }),
    ...(config.forcePathStyle === undefined ? {} : { forcePathStyle: config.forcePathStyle }),
    credentials: {
      accessKeyId: required(credentials, "publicAssetAccessKeyId"),
      secretAccessKey: required(credentials, "publicAssetSecretAccessKey"),
      ...(sessionToken === undefined ? {} : { sessionToken }),
    },
  });
  const prefix = normalizedPrefix(config.prefix);
  const base = config.publicBaseUrl.replace(/\/+$/u, "");
  return async (artifact, resources) => {
    const bytes = await resources.get(artifact.resource);
    if (bytes === undefined || bytes.byteLength !== artifact.size) throw new Error(`StarRouter reference ${artifact.resource} is unavailable`);
    // ponytail: 由存储桶生命周期策略统一回收公开素材；需要逐 Build 撤销时再引入删除回执。
    const key = `${prefix.length === 0 ? "" : `${prefix}/`}${artifact.resource}`;
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentLength: bytes.byteLength,
      ContentType: artifact.mediaType,
    }));
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  };
}
