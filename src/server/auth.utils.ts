export function extractBearerToken(authorizationHeader?: string | string[]): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const rawHeader = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = rawHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
