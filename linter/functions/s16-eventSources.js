import eventField from './s16-eventField.js';
import { isObject } from './lib/util.js';

/**
 * Inspect CloudEvents source values in AsyncAPI component messages and inline
 * channel messages. The rule runs on the resolved document so payload schema
 * references are inspected. Component messages are visited first and payload
 * objects are deduplicated by identity, which keeps a channel reference to a
 * component message from reporting the same schema twice.
 *
 * @param {unknown} targetVal - the resolved AsyncAPI document.
 * @param {object} options - options forwarded to s16-eventField.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function eventSources(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  const seen = new WeakSet();
  const results = [];

  const inspect = (message, path) => {
    if (!isObject(message) || !isObject(message.payload) || seen.has(message.payload)) return;
    seen.add(message.payload);
    const findings = eventField(message.payload, options, { path: [...base, ...path, 'payload'] });
    if (Array.isArray(findings)) results.push(...findings);
  };

  if (isObject(targetVal.components) && isObject(targetVal.components.messages)) {
    for (const [name, message] of Object.entries(targetVal.components.messages)) {
      inspect(message, ['components', 'messages', name]);
    }
  }

  if (isObject(targetVal.channels)) {
    for (const [channelName, channel] of Object.entries(targetVal.channels)) {
      if (!isObject(channel) || !isObject(channel.messages)) continue;
      for (const [messageName, message] of Object.entries(channel.messages)) {
        inspect(message, ['channels', channelName, 'messages', messageName]);
      }
    }
  }

  return results.length ? results : undefined;
}
