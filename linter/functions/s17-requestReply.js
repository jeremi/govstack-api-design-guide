import { isObject, asArray } from './lib/util.js';

/**
 * s17-requestReply — §17.17 declared request-reply correlation.
 *
 * Given: a single RESOLVED AsyncAPI 3.0 operation object (`$.operations[*]`).
 * Resolution turns `reply.channel` / message `$ref`s into objects, which this
 * walk relies on to find declared correlation.
 *
 * The rule only bites when the operation declares a `reply` (request-reply). For
 * such an operation it asserts:
 *   - a reply target is declared: `reply.channel` or `reply.address`, and
 *   - a correlation mechanism is declared: some reachable message (the reply's
 *     messages, the reply channel's messages, or the operation's own messages)
 *     declares a `correlationId`, or `reply.address` carries a `location`.
 *
 * The inverse guidance ("fire-and-forget MUST NOT pretend to be request-reply")
 * is not mechanically decidable and is not enforced here.
 *
 * options: none.
 * @param {unknown} targetVal - an operation object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17RequestReply(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const reply = targetVal.reply;
  if (reply === undefined) return; // not request-reply — nothing to check
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  if (!isObject(reply)) {
    return [{ message: 'operation "reply" must be an object declaring a reply channel/address and correlation', path: [...base, 'reply'] }];
  }

  const hasTarget = isObject(reply.channel) || isObject(reply.address);
  if (!hasTarget) {
    results.push({
      message: 'request-reply operation must declare the reply channel or reply address pattern under "reply"',
      path: [...base, 'reply'],
    });
  }

  const candidateMessages = [];
  const collect = (v) => {
    for (const m of asArray(v)) if (isObject(m)) candidateMessages.push(m);
  };
  collect(reply.messages);
  if (isObject(reply.channel) && isObject(reply.channel.messages)) collect(Object.values(reply.channel.messages));
  collect(targetVal.messages);
  if (isObject(targetVal.channel) && isObject(targetVal.channel.messages)) collect(Object.values(targetVal.channel.messages));

  const addressCorrelated = isObject(reply.address) && reply.address.location !== undefined;
  const messageCorrelated = candidateMessages.some((m) => isObject(m.correlationId));

  if (!addressCorrelated && !messageCorrelated) {
    results.push({
      message: 'request-reply operation must declare a correlation mechanism (a message "correlationId" or a "reply.address.location")',
      path: [...base, 'reply'],
    });
  }

  return results.length ? results : undefined;
}
