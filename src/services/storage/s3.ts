// Minimal client helper to request a presigned PUT URL and upload a file.
export async function getPresignUrl(key: string, contentType: string, expiresIn = 900) {
  const res = await fetch('/api/s3/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, contentType, expiresIn }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Presign failed: ${txt}`);
  }

  return res.json();
}

export async function uploadFileToS3(file: File, key: string) {
  const { url } = await getPresignUrl(key, file.type || 'application/octet-stream');
  const put = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
  if (!put.ok) throw new Error('Upload failed');
  // Return the public object URL (strip query)
  return url.split('?')[0];
}

export default { getPresignUrl, uploadFileToS3 };
