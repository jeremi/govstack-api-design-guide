/** Separate a terminal colon custom method from its resource path.
 * Malformed or misplaced suffixes remain literal segments for casing checks.
 * Path parameters are opaque and cannot contain a custom-method delimiter.
 */
export function resourcePath(path) {
  const segments = typeof path === 'string' ? path.split('/').filter(Boolean) : [];
  const last = segments.at(-1) ?? '';
  const match = /^([^:]+):([^:{}]+)$/.exec(last);
  if (!match || segments.slice(0, -1).some((segment) => segment.includes(':'))) {
    return { segments, customMethod: undefined };
  }
  return { segments: [...segments.slice(0, -1), match[1]], customMethod: match[2] };
}

export const isPathParameter = (segment) => /^\{[^{}:]+\}$/.test(segment);
