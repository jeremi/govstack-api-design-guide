import { isObject } from './lib/util.js';

const LOGICAL_CHANNEL_ID_RE =
  /^org\.govstack\.[a-z][a-z0-9-]{1,30}\.v[0-9]+(?:\.(?:[a-z][a-zA-Z0-9-]*|\{[a-zA-Z0-9_]+\})){2,}$/;

/**
 * Validate the stable logical IDs used as keys of an AsyncAPI channels map.
 * Channel Object `address` values intentionally are not inspected here because
 * they use protocol-native destination syntax (§17.2).
 *
 * @param {unknown} targetVal - the AsyncAPI channels map.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function channelIds(targetVal, _options, context) {
  if (!isObject(targetVal)) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  for (const logicalId of Object.keys(targetVal)) {
    if (LOGICAL_CHANNEL_ID_RE.test(logicalId)) continue;

    results.push({
      message:
        `logical channel ID "${logicalId}" must match ` +
        'org.govstack.{bb-code}.v{major}.{resource}.{event}',
      path: [...base, logicalId],
    });
  }

  return results.length ? results : undefined;
}
