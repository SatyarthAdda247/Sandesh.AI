/**
 * S3 storage utilities for MarCom Automation.
 * Uses AWS SDK v3 with dedicated prefix to avoid disturbing existing bucket structure.
 */

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

/**
 * Generate AWS Signature V4 for S3 requests
 */
async function getSignature(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payload: string,
  config: S3Config
): Promise<string> {
  const crypto = globalThis.crypto;
  
  async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
    const keyObj = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', keyObj, new TextEncoder().encode(data));
  }

  async function hash(data: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = await hash(payload);

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join('\n') + '\n';

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(k => k.toLowerCase())
    .join(';');

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    headers['x-amz-content-sha256']
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await hash(canonicalRequest)
  ].join('\n');

  let key = new TextEncoder().encode(`AWS4${config.secretAccessKey}`);
  key = new Uint8Array(await hmac(key, dateStamp));
  key = new Uint8Array(await hmac(key, config.region));
  key = new Uint8Array(await hmac(key, 's3'));
  key = new Uint8Array(await hmac(key, 'aws4_request'));
  
  const signature = Array.from(new Uint8Array(await hmac(key, stringToSign)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Upload content to S3 under marcom-automation/ prefix
 */
export async function uploadToS3(
  key: string,
  content: string | Uint8Array,
  contentType: string,
  config: S3Config
): Promise<UploadResult> {
  // Ensure we use marcom-automation prefix to avoid conflicts
  const fullKey = key.startsWith('marcom-automation/') ? key : `marcom-automation/${key}`;
  
  const url = new URL(`https://${config.bucket}.s3.${config.region}.amazonaws.com/${fullKey}`);
  const payload = typeof content === 'string' ? content : new TextDecoder().decode(content);
  
  const headers: Record<string, string> = {
    'host': url.host,
    'content-type': contentType,
    'content-length': String(new TextEncoder().encode(payload).length)
  };

  const auth = await getSignature('PUT', url, headers, payload, config);
  headers['Authorization'] = auth;

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers,
    body: payload
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${text}`);
  }

  return {
    key: fullKey,
    url: url.toString(),
    etag: response.headers.get('etag') || undefined
  };
}

/**
 * Read content from S3
 */
export async function readFromS3(
  key: string,
  config: S3Config
): Promise<string> {
  const fullKey = key.startsWith('marcom-automation/') ? key : `marcom-automation/${key}`;
  const url = new URL(`https://${config.bucket}.s3.${config.region}.amazonaws.com/${fullKey}`);
  
  const headers: Record<string, string> = {
    'host': url.host
  };

  const auth = await getSignature('GET', url, headers, '', config);
  headers['Authorization'] = auth;

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`S3 read failed: ${response.status}`);
  }

  return await response.text();
}

/**
 * List objects under marcom-automation/ prefix
 */
export async function listS3Objects(
  prefix: string,
  config: S3Config
): Promise<string[]> {
  const fullPrefix = `marcom-automation/${prefix}`;
  const url = new URL(`https://${config.bucket}.s3.${config.region}.amazonaws.com/`);
  url.searchParams.set('list-type', '2');
  url.searchParams.set('prefix', fullPrefix);
  
  const headers: Record<string, string> = {
    'host': url.host
  };

  const auth = await getSignature('GET', url, headers, '', config);
  headers['Authorization'] = auth;

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`S3 list failed: ${response.status}`);
  }

  const xml = await response.text();
  const keys: string[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  let match;
  while ((match = keyRegex.exec(xml)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

/**
 * Get S3 config from environment variables
 */
export function getS3Config(): S3Config | null {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const region = Deno.env.get('AWS_REGION') || 'ap-south-1';
  const bucket = Deno.env.get('S3_BUCKET_NAME') || 'scriptiq-content';

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket
  };
}

