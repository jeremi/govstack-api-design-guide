import { isObject } from './lib/util.js';

/**
 * s17-protocolBindings — §17.19 protocol bindings where relevant (PROXY).
 *
 * Given: the whole RESOLVED AsyncAPI 3.0 document (`$`).
 *
 * Proxy check. Collects the transport protocols declared on `servers` and, for
 * each channel, asserts that a matching protocol binding is declared either on
 * the channel itself or on any operation bound to it. Protocol names are
 * normalised (wss->ws, amqps->amqp, mqtts->mqtt, kafka-secure->kafka, https->
 * http, …) before comparison.
 *
 * Does NOT verify the specific fields inside the bindings (Kafka topic/key, MQTT
 * QoS/retained, AMQP exchange/queue/routing-key, WebSocket/SSE framing), nor
 * whether protocol-specific fields genuinely affect interoperability.
 *
 * options: none.
 * @param {unknown} targetVal - the document root ($).
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17ProtocolBindings(targetVal, _options, context) {
  const root = targetVal;
  if (!isObject(root) || !isObject(root.channels)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const serverProtocols = new Set();
  if (isObject(root.servers)) {
    for (const srv of Object.values(root.servers)) {
      if (isObject(srv) && typeof srv.protocol === 'string') {
        const p = normaliseProtocol(srv.protocol);
        if (p && BINDING_RELEVANT.has(p)) serverProtocols.add(p);
      }
    }
  }
  if (serverProtocols.size === 0) return; // no binding-relevant protocol to check against

  // address -> set of normalised binding keys contributed by channel + its ops
  const byAddress = new Map();
  const bindingKeysOf = (node) => {
    if (!isObject(node) || !isObject(node.bindings)) return [];
    return Object.keys(node.bindings).map(normaliseProtocol).filter(Boolean);
  };

  for (const ch of Object.values(root.channels)) {
    if (isObject(ch) && typeof ch.address === 'string') {
      const set = byAddress.get(ch.address) || new Set();
      for (const k of bindingKeysOf(ch)) set.add(k);
      byAddress.set(ch.address, set);
    }
  }
  if (isObject(root.operations)) {
    for (const op of Object.values(root.operations)) {
      const ch = isObject(op) ? op.channel : undefined;
      if (isObject(ch) && typeof ch.address === 'string') {
        const set = byAddress.get(ch.address) || new Set();
        for (const k of bindingKeysOf(op)) set.add(k);
        byAddress.set(ch.address, set);
      }
    }
  }

  const results = [];
  for (const [key, ch] of Object.entries(root.channels)) {
    if (!isObject(ch)) continue;
    const declared = new Set(bindingKeysOf(ch));
    if (typeof ch.address === 'string') for (const k of byAddress.get(ch.address) || []) declared.add(k);
    const matches = [...serverProtocols].some((p) => declared.has(p));
    if (!matches) {
      results.push({
        message: `channel "${key}" (or an operation bound to it) should declare protocol bindings for the server protocol(s) ${JSON.stringify([...serverProtocols])}`,
        path: [...base, 'channels', key, 'bindings'],
      });
    }
  }

  return results.length ? results : undefined;
}

const BINDING_RELEVANT = new Set([
  'kafka', 'mqtt', 'amqp', 'amqp1', 'ws', 'http', 'sqs', 'sns', 'googlepubsub',
  'nats', 'stomp', 'redis', 'jms', 'pulsar', 'solace', 'ibmmq', 'anypointmq',
]);

function normaliseProtocol(p) {
  if (typeof p !== 'string') return undefined;
  const s = p.toLowerCase();
  const map = {
    wss: 'ws',
    websocket: 'ws',
    amqps: 'amqp',
    mqtts: 'mqtt',
    'secure-mqtt': 'mqtt',
    'kafka-secure': 'kafka',
    https: 'http',
  };
  return map[s] || s;
}
