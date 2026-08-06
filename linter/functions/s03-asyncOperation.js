import { isObject, isNonEmptyString } from './lib/util.js';

const ACTIONS = new Set(['send', 'receive']);

/** The $ref string of a Reference Object, or undefined for anything else. */
function refString(node) {
  return isObject(node) && typeof node.$ref === 'string' ? node.$ref : undefined;
}

/**
 * Resolve a local JSON Pointer ("#/channels/foo") against the document root.
 * Returns undefined for non-local refs or unresolvable pointers.
 */
function resolveLocalRef(root, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  const parts = ref
    .slice(2)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = root;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[p];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/**
 * s03-asyncOperation — §3.7 AsyncAPI 3.0 operation-metadata completeness.
 *
 * Given: the whole UNRESOLVED AsyncAPI 3.0 document (`$`, with `resolved: false`
 * on the rule) so that operation `channel` / `messages` $ref pointers are still
 * visible as strings.
 *
 * For every entry under `operations`, asserts it declares:
 *   - `action` == "send" or "receive"
 *   - a non-empty `description`
 *   - a `channel` Reference Object ({$ref: <string>})
 *   - a non-empty `messages` array of Reference Objects
 *   - each `messages[i]` $ref points into the operation's referenced channel's
 *     messages (ref begins "<channelRef>/messages/"); when the channel ref is a
 *     local pointer, the referenced message key must exist on that channel.
 *
 * The CloudEvents-ness of the referenced message is a §17.6 concern and is not
 * checked here; this only verifies presence and channel-membership.
 *
 * options: none.
 * @param {unknown} targetVal - the document root ($).
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s03AsyncOperation(targetVal, _options, context) {
  const root = targetVal;
  if (!isObject(root) || !isObject(root.operations)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const findings = [];

  for (const [opId, op] of Object.entries(root.operations)) {
    const at = (...seg) => [...base, 'operations', opId, ...seg];
    if (!isObject(op)) {
      findings.push({ message: `operation "${opId}" must be an object`, path: at() });
      continue;
    }

    if (!ACTIONS.has(op.action)) {
      findings.push({ message: `operation "${opId}" must declare action "send" or "receive"`, path: at('action') });
    }
    if (!isNonEmptyString(op.description)) {
      findings.push({ message: `operation "${opId}" must declare a non-empty description`, path: at('description') });
    }

    const channelRef = refString(op.channel);
    if (!channelRef) {
      findings.push({ message: `operation "${opId}" must reference a channel via $ref`, path: at('channel') });
    }

    const messages = op.messages;
    if (!Array.isArray(messages) || messages.length < 1) {
      findings.push({ message: `operation "${opId}" must reference at least one channel message via $ref`, path: at('messages') });
      continue;
    }

    messages.forEach((m, i) => {
      const mRef = refString(m);
      if (!mRef) {
        findings.push({ message: `operation "${opId}" message ${i} must be a $ref to a channel message`, path: at('messages', i) });
        return;
      }
      if (!channelRef) return; // channel error already reported; can't cross-check
      const prefix = `${channelRef}/messages/`;
      if (!mRef.startsWith(prefix)) {
        findings.push({
          message: `operation "${opId}" message ${i} ($ref "${mRef}") must reference a message on the operation's channel "${channelRef}"`,
          path: at('messages', i),
        });
        return;
      }
      // For local channel refs, confirm the message key is actually declared.
      if (channelRef.startsWith('#/')) {
        const channel = resolveLocalRef(root, channelRef);
        const key = mRef.slice(prefix.length);
        if (isObject(channel) && (!isObject(channel.messages) || !(key in channel.messages))) {
          findings.push({
            message: `operation "${opId}" message ${i} references "${key}" which is not defined on channel "${channelRef}"`,
            path: at('messages', i),
          });
        }
      }
    });
  }

  return findings.length ? findings : undefined;
}
