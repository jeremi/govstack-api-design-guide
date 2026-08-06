import { isObject, asArray } from './lib/util.js';

/**
 * s17-rejectionMessage — §17.16 async rejection/failure messages (PROXY).
 *
 * Given: the whole RESOLVED AsyncAPI 3.0 document (`$`).
 *
 * Proxy check. The guide requires that command-like messages which can be
 * rejected asynchronously define a rejection/failure message using the common
 * §11 error envelope, correlated to the original message. This function CANNOT
 * identify which messages are "command-like", so, when the document declares any
 * operations, it asserts:
 *   - at least one `components.messages` entry references GovStackAsyncError or
 *     declares its transport-neutral `code`+`traceId`/`traceid` shape without
 *     an HTTP `status`, and
 *   - at least one such error message declares a correlation mechanism (a
 *     message-level `correlationId`, or a header/payload property whose name
 *     contains "correlation").
 *
 * Does NOT verify: which specific operations need a rejection message, nor that
 * the correlation actually points at the initiating message.
 *
 * options: none.
 * @param {unknown} targetVal - the document root ($).
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17RejectionMessage(targetVal, _options, context) {
  const root = targetVal;
  if (!isObject(root) || !isObject(root.operations) || Object.keys(root.operations).length === 0) return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const messages = isObject(root.components) ? root.components.messages : undefined;
  const entries = isObject(messages) ? Object.entries(messages) : [];

  const errorMessages = entries.filter(([, msg]) => isErrorEnvelope(msg));

  if (errorMessages.length === 0) {
    return [
      {
        message:
          'no async rejection/failure message using the §11 error envelope was found under components.messages; command-like messages that can be rejected asynchronously must define one',
        path: [...base, 'components', 'messages'],
      },
    ];
  }

  const correlated = errorMessages.some(([, msg]) => hasCorrelation(msg));
  if (!correlated) {
    const [name] = errorMessages[0];
    return [
      {
        message: `async rejection message "${name}" must declare correlation metadata (a correlationId or a correlation header/attribute) linking it to the original message`,
        path: [...base, 'components', 'messages', name],
      },
    ];
  }

  return undefined;
}

/** Property names declared on a schema, merging one level of allOf. */
function propNames(schema) {
  const names = new Set();
  if (!isObject(schema)) return names;
  if (isObject(schema.properties)) for (const n of Object.keys(schema.properties)) names.add(n);
  for (const branch of asArray(schema.allOf)) {
    if (isObject(branch) && isObject(branch.properties)) for (const n of Object.keys(branch.properties)) names.add(n);
  }
  return names;
}

/** True when a set of property names looks like the §11 problem envelope. */
function problemShaped(names) {
  const has = (n) => names.has(n);
  return !has('status') && has('code') && (has('traceId') || has('traceid'));
}

function isErrorEnvelope(msg) {
  if (!isObject(msg)) return false;
  const payload = msg.payload;
  if (referencesSchema(payload, 'GovStackAsyncError')) return true;
  // Bare §11 envelope, or CloudEvents-wrapped with the problem under `data`.
  if (problemShaped(propNames(payload))) return true;
  for (const data of propertySchemas(payload, 'data')) {
    if (referencesSchema(data, 'GovStackAsyncError')) return true;
    if (problemShaped(propNames(data))) return true;
  }
  return false;
}

/** Property schemas declared directly or in one level of allOf. */
function propertySchemas(schema, name) {
  if (!isObject(schema)) return [];
  const values = [];
  if (isObject(schema.properties?.[name])) values.push(schema.properties[name]);
  for (const branch of asArray(schema.allOf)) {
    if (isObject(branch) && isObject(branch.properties?.[name])) {
      values.push(branch.properties[name]);
    }
  }
  return values;
}

function referencesSchema(schema, name) {
  return (
    isObject(schema) &&
    typeof schema.$ref === 'string' &&
    schema.$ref.endsWith(`#/components/schemas/${name}`)
  );
}

function hasCorrelation(msg) {
  if (!isObject(msg)) return false;
  if (isObject(msg.correlationId)) return true;
  const names = [...propNames(msg.payload), ...propNames(msg.headers)];
  return names.some((n) => /correlation/i.test(n));
}
