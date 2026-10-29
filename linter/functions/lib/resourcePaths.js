/** Split a path key into its literal and parameter segments. */
export function pathSegmentsOf(path) {
  return typeof path === 'string' ? path.split('/').filter(Boolean) : [];
}

export const isPathParameter = (segment) => /^\{[^{}:]+\}$/.test(segment);
