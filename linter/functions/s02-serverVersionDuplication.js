import { isObject } from './lib/util.js';

/**
 * Reject a numeric major-version segment in a server URL only when a path key
 * carries the same version. A versioned deployment base URL is otherwise
 * permitted by §2.6.
 */
export default function serverVersionDuplication(targetVal, _options, context) {
  if (!isObject(targetVal) || !isObject(targetVal.paths) || !Array.isArray(targetVal.servers)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const pathVersions = new Set();

  for (const path of Object.keys(targetVal.paths)) {
    const match = /^\/v([0-9]+)(?:\/|$)/.exec(path);
    if (match) pathVersions.add(match[1]);
  }
  if (pathVersions.size === 0) return;

  const results = [];
  targetVal.servers.forEach((server, index) => {
    if (!isObject(server) || typeof server.url !== 'string') return;
    const urlWithoutQueryOrFragment = server.url.split(/[?#]/, 1)[0];
    const versions = [...urlWithoutQueryOrFragment.matchAll(/\/v([0-9]+)(?=\/|$)/g)].map((match) => match[1]);
    const duplicate = versions.find((version) => pathVersions.has(version));
    if (duplicate) {
      results.push({
        message: `server URL repeats the /v${duplicate} segment already present in path keys`,
        path: [...base, 'servers', index, 'url'],
      });
    }
  });

  return results.length ? results : undefined;
}
