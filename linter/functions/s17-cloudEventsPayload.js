import { isObject, asArray } from './lib/util.js';

const CE_ENVELOPE_REQUIRED = ['specversion', 'id', 'source', 'type'];

/**
 * s17-cloudEventsPayload — §17.6 structured CloudEvents JSON payloads.
 *
 * Given: a single AsyncAPI 3.0 message object (`$.components.messages[*]`).
 *
 * For domain-event messages, asserts contentType is
 * `application/cloudevents+json` and the payload declares the structured
 * CloudEvents shape: `specversion` (const "1.0"), `id`, `source`, and `type`.
 * Event `data` remains optional and locally specialised. One level of top-level
 * `allOf` is merged. A reference to the reviewed shared CloudEventEnvelope
 * contributes its known fields; base AsyncAPI validation separately proves
 * that the external reference resolves.
 *
 * Messages that do not declare the CloudEvents media type, reference a
 * CloudEvents envelope, or expose CloudEvents fields are OUT of scope. This is
 * deliberate: the guide permits non-CloudEvents commands and transport-native
 * messages, and a linter cannot infer that they are domain events.
 *
 * Options:
 *   requireSharedReference {boolean} when true, only check that the message
 *     payload references the vendored CloudEventEnvelope or GovStackAsyncError.
 *     The corresponding rule runs with `resolved: false` so the authored
 *     external reference remains visible.
 * @param {unknown} targetVal - a message object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17CloudEventsPayload(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const payload = targetVal.payload;
  if (!isObject(payload)) return; // no inline payload schema to inspect
  const base = context && Array.isArray(context.path) ? context.path : [];
  if (isObject(options) && options.requireSharedReference === true) {
    if (
      referencesVendoredSchema(payload, 'CloudEventEnvelope') ||
      referencesVendoredSchema(payload, 'GovStackAsyncError')
    ) {
      return;
    }
    if (!isCloudEventMessage(targetVal, payload) && !isAsyncErrorSchema(payload)) return;
    return [
      {
        message:
          'message payload must reference the schema from the vendored common/govstack-asyncapi-common.yaml file',
        path: [...base, 'payload'],
      },
    ];
  }
  if (!isCloudEventMessage(targetVal, payload)) return;
  const { required, properties } = effective(payload);

  const results = [];
  const at = [...base, 'payload'];
  if (targetVal.contentType !== 'application/cloudevents+json') {
    results.push({
      message: 'CloudEvents Message Object must set contentType to "application/cloudevents+json"',
      path: [...base, 'contentType'],
    });
  }
  for (const name of CE_ENVELOPE_REQUIRED) {
    if (!required.has(name)) {
      results.push({ message: `CloudEvents payload must list "${name}" in required`, path: [...at, 'required'] });
    }
  }
  const sv = properties.specversion;
  if (isObject(sv) && 'const' in sv && sv.const !== '1.0') {
    results.push({
      message: 'CloudEvents payload "specversion" must be declared with const "1.0"',
      path: [...at, 'properties', 'specversion', 'const'],
    });
  }
  return results.length ? results : undefined;
}

function isCloudEventMessage(message, payload) {
  if (message.contentType === 'application/cloudevents+json') return true;
  if (referencesSchema(payload, 'CloudEventEnvelope')) return true;
  const { required, properties } = effective(payload);
  return required.has('specversion') || properties.specversion !== undefined;
}

function isAsyncErrorSchema(payload) {
  if (referencesSchema(payload, 'GovStackAsyncError')) return true;
  const { required, properties } = effective(payload);
  const declared = (name) => required.has(name) || properties[name] !== undefined;
  return !declared('status') && declared('code') && (declared('traceId') || declared('traceid'));
}

/** Merge a schema's own required/properties with one level of allOf branches. */
function effective(schema) {
  const required = new Set(asArray(schema.required).filter((s) => typeof s === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  for (const branch of asArray(schema.allOf)) {
    if (!isObject(branch)) continue;
    if (referencesSchema(branch, 'CloudEventEnvelope')) {
      for (const name of CE_ENVELOPE_REQUIRED) required.add(name);
      properties.specversion ??= { const: '1.0' };
    }
    for (const r of asArray(branch.required)) if (typeof r === 'string') required.add(r);
    if (isObject(branch.properties)) {
      for (const [k, v] of Object.entries(branch.properties)) if (!(k in properties)) properties[k] = v;
    }
  }
  return { required, properties };
}

function referencesSchema(schema, name) {
  if (!isObject(schema)) return false;
  const suffix = `#/components/schemas/${name}`;
  if (typeof schema.$ref === 'string' && schema.$ref.endsWith(suffix)) return true;
  return asArray(schema.allOf).some(
    (branch) => isObject(branch) && typeof branch.$ref === 'string' && branch.$ref.endsWith(suffix),
  );
}

function referencesVendoredSchema(schema, name) {
  if (!isObject(schema)) return false;
  const pattern = new RegExp(
    `(?:^|/)(?:api/)?common/govstack-asyncapi-common\\.yaml#/components/schemas/${name}$`,
  );
  const matchesLocalRef = (ref) =>
    typeof ref === 'string' &&
    !ref.startsWith('/') &&
    !ref.startsWith('//') &&
    !/^[a-z][a-z+.-]*:/i.test(ref) &&
    pattern.test(ref);
  if (matchesLocalRef(schema.$ref)) return true;
  return asArray(schema.allOf).some(
    (branch) => isObject(branch) && matchesLocalRef(branch.$ref),
  );
}
