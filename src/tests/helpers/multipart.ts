export function buildMultipartBody(
  fields: Record<string, string>,
  boundary = 'testboundary'
): { payload: Buffer; contentType: string } {
  const parts: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`
    )
  }
  parts.push(`--${boundary}--`)
  return {
    payload: Buffer.from(parts.join('\r\n')),
    contentType: `multipart/form-data; boundary=${boundary}`
  }
}
