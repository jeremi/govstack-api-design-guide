import { isObject } from './lib/util.js';

const OPENAPI_VERSION_SEG = /^\/v(\d+)(?:\/|$)/;
const ASYNCAPI_VERSION_SEG = /(?:^|\.)v(\d+)(?:\.|$)/;

/**
 * s18-versionMajorConsistency — guide 18.2: a major version increment MUST be
 * reflected in the OpenAPI URL path (`/v2/`) or the AsyncAPI channel address,
 * and that reflected major MUST match `info.version`'s major segment.
 *
 * `given` should be `$` (the whole document), so the function can read
 * `info.version` alongside `paths`/`channels` in one pass.
 *
 * options:
 *   surface {string} required, "openapi" | "asyncapi".
 *     "openapi"  - every `paths` key that already carries a `/v{N}/` prefix
 *                  must have N == info.version's major. Paths with no version
 *                  prefix at all are guide 5.1's concern, not this rule's.
 *     "asyncapi" - every `channels` entry's address must embed a `.v{N}.`
 *                  segment matching info.version's major. Does NOT verify the
 *                  text's alternative "equivalent machine-readable version
 *                  field documented in govstack-asyncapi-common.yaml" (that
 *                  needs the vendored common file).
 *
 * Non-object input, or an info.version that isn't a plain SemVer-shaped
 * string, returns undefined (guide 18.1 owns validating info.version itself).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function versionMajorConsistency(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];

  const version = isObject(targetVal.info) ? targetVal.info.version : undefined;
  if (typeof version !== 'string') return;
  const versionMajorMatch = version.match(/^(\d+)\./);
  if (!versionMajorMatch) return;
  const infoMajor = versionMajorMatch[1];

  const results = [];

  if (opts.surface === 'openapi') {
    const paths = targetVal.paths;
    if (!isObject(paths)) return;
    for (const key of Object.keys(paths)) {
      const m = typeof key === 'string' ? key.match(OPENAPI_VERSION_SEG) : null;
      if (!m) continue;
      if (m[1] !== infoMajor) {
        results.push({
          message: `path "${key}" declares version v${m[1]} but info.version is "${version}" (major ${infoMajor}); the path's major version must match info.version's major`,
          path: [...base, 'paths', key],
        });
      }
    }
  } else if (opts.surface === 'asyncapi') {
    const channels = targetVal.channels;
    if (!isObject(channels)) return;
    for (const [key, channel] of Object.entries(channels)) {
      if (!isObject(channel)) continue;
      const address = typeof channel.address === 'string' ? channel.address : key;
      const m = address.match(ASYNCAPI_VERSION_SEG);
      if (!m) {
        results.push({
          message: `channel "${key}" address "${address}" does not include a major version segment (e.g. ".v${infoMajor}."); AsyncAPI channels must include the major version in the channel address`,
          path: [...base, 'channels', key],
        });
        continue;
      }
      if (m[1] !== infoMajor) {
        results.push({
          message: `channel "${key}" address "${address}" declares version v${m[1]} but info.version is "${version}" (major ${infoMajor}); the channel's major version must match info.version's major`,
          path: [...base, 'channels', key],
        });
      }
    }
  } else {
    return;
  }

  return results.length ? results : undefined;
}
