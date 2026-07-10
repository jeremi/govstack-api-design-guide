import { isObject } from './lib/util.js';

const VERSION_SEG = /^v\d+$/;
const isParam = (seg) => seg.startsWith('{') && seg.endsWith('}');
const split = (key) => key.split('/').filter((s) => s.length > 0);

// Lexical dictionary of common CRUD-mirroring / domain action verbs. No
// morphology: this both under- and over-fires (see JSDoc below).
const DEFAULT_VERBS = [
  'get', 'create', 'new', 'add', 'update', 'edit', 'modify', 'delete', 'remove',
  'fetch', 'retrieve', 'list', 'find', 'set', 'cancel', 'approve', 'reject',
  'submit', 'publish', 'activate', 'deactivate', 'archive', 'restore', 'confirm',
  'verify', 'validate', 'process', 'execute', 'start', 'stop', 'pause', 'resume',
  'complete', 'close', 'reopen', 'send', 'search',
];

/**
 * actionVerbSegment — STRICT-ONLY heuristic: flags a path whose final,
 * non-parameter segment is a verb (from a fixed lexical list) that is NOT
 * immediately preceded by a `{param}` segment.
 *
 * Drives both guide 5.7 ("verbs MUST NOT appear in CRUD paths") and 5.8
 * ("non-CRUD actions MUST be sub-resources, i.e. /{collection}/{id}/{verb}")
 * — the guide states the same shape requirement from two directions
 * (prohibition vs. required positive shape), so both rules share this one
 * detector and differ only in id/message/severity/docs.
 *
 * Purely lexical: it does not know which paths are "CRUD operations" vs.
 * legitimate collection names that happen to end in a dictionary verb (e.g.
 * a segment literally named "process" as a noun), so it both over- and
 * under-fires. `verbs` lets callers extend the default list.
 *
 * Given: $.paths
 * Options: verbs {string[]} additional verbs merged into the default list.
 *
 * @param {unknown} targetVal - the paths object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function actionVerbSegment(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const verbs = new Set([
    ...DEFAULT_VERBS,
    ...(Array.isArray(opts.verbs) ? opts.verbs.map((v) => String(v).toLowerCase()) : []),
  ]);
  const results = [];

  for (const key of Object.keys(targetVal)) {
    if (typeof key !== 'string' || !key.startsWith('/')) continue;
    const segs = split(key);
    if (segs.length === 0) continue;
    const last = segs[segs.length - 1];
    if (isParam(last) || VERSION_SEG.test(last)) continue;
    const words = last.split('-');
    const verbLike = words.some((w) => verbs.has(w.toLowerCase()));
    if (!verbLike) continue;
    const prev = segs.length >= 2 ? segs[segs.length - 2] : undefined;
    if (!isParam(prev)) {
      results.push({
        message: `path "${key}" ends in a verb-like segment "${last}" without a preceding {id} sub-resource`,
        path: [...base, key],
      });
    }
  }

  return results.length ? results : undefined;
}
