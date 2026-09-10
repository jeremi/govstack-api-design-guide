import { isObject, asArray } from './lib/util.js';

const CE_ENVELOPE_REQUIRED = ['specversion', 'id', 'source', 'type'];

/**
 * s17-cloudEventsPayload — §17.6 structured CloudEvents JSON payloads.
 *
 * Given: a single AsyncAPI 3 message object (`$.components.messages[*]`).
 *
 * For domain-event messages, asserts contentType is
 * `application/cloudevents+json` and the payload declares the structured
 * CloudEvents shape: `specversion` (fixed "1.0"), `id`, `source`, and `type`.
 * Event `data` remains optional and locally specialised. Nested `allOf`
 * declarations are merged after Spectral resolves references; base AsyncAPI
 * validation separately proves that external references resolve.
 *
 * Messages that do not declare the CloudEvents media type, reference a
 * CloudEvents envelope, or expose CloudEvents fields are OUT of scope. This is
 * deliberate: the guide permits non-CloudEvents commands and transport-native
 * messages, and a linter cannot infer that they are domain events.
 *
 * Options:
 *   requireSharedReference {boolean} when true, check shared async-error reuse
 *     in a bare payload or CloudEvent data and require any explicit common
 *     envelope reference to be vendored. Local event envelopes are permitted.
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
    const results = [];
    const { properties } = effective(payload);
    const cloudEvent = isCloudEventMessage(targetVal, payload);
    const errorPayload = cloudEvent ? properties.data : payload;
    if (isObject(errorPayload) && isAsyncErrorSchema(errorPayload) &&
        !referencesVendoredSchema(errorPayload, 'GovStackAsyncError')) {
      results.push({
        message: 'async-error payload must reference GovStackAsyncError from the vendored common/govstack-asyncapi-common.yaml file',
        path: [...base, 'payload'],
      });
    }
    if (referencesCommonEnvelope(payload) && !referencesVendoredSchema(payload, 'CloudEventEnvelope')) {
      results.push({
        message: 'shared CloudEventEnvelope must reference the vendored common/govstack-asyncapi-common.yaml file; a local CloudEvents-conforming envelope is also permitted',
        path: [...base, 'payload'],
      });
    }
    return results.length ? results : undefined;
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
    if (!isObject(properties[name])) {
      results.push({ message: `CloudEvents payload must declare a schema for "${name}"`, path: at });
    }
  }
  if (!fixesSpecversion(properties.specversion)) {
    results.push({
      message: 'CloudEvents payload "specversion" must be restricted to "1.0" using const or enum',
      path: at,
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

/** Merge conjunctive declarations without trusting a schema's name as its shape. */
function effective(schema, seen = new Set()) {
  if (!isObject(schema) || seen.has(schema)) return { required: new Set(), properties: {} };
  seen.add(schema);
  const required = new Set(asArray(schema.required).filter((s) => typeof s === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  for (const branch of asArray(schema.allOf)) {
    const inherited = effective(branch, seen);
    for (const name of inherited.required) required.add(name);
    for (const [key, value] of Object.entries(inherited.properties)) {
      properties[key] = key in properties ? { allOf: [properties[key], value] } : value;
    }
  }
  return { required, properties };
}

/** Inspect only const/enum constraints across conjunctions, not arbitrary JSON Schema. */
function fixesSpecversion(schema) {
  let allowed;
  const seen = new Set();
  const visit = (part) => {
    if (part === false) allowed = new Set();
    if (!isObject(part) || seen.has(part)) return;
    seen.add(part);
    const restrict = (values) => {
      allowed = allowed === undefined ? new Set(values) : new Set(values.filter((value) => allowed.has(value)));
    };
    if ('const' in part) restrict([part.const]);
    if (Array.isArray(part.enum)) restrict(part.enum);
    if ('type' in part && part.type !== 'string' && !asArray(part.type).includes('string')) restrict([]);
    for (const branch of asArray(part.allOf)) visit(branch);
  };
  visit(schema);
  return allowed?.size === 1 && allowed.has('1.0');
}

function referencesCommonEnvelope(schema) {
  return schemaReferences(schema).some((ref) =>
    /(?:^|\/)govstack-asyncapi-common\.yaml#\/components\/schemas\/CloudEventEnvelope$/.test(ref));
}

function schemaReferences(schema, seen = new Set()) {
  if (!isObject(schema) || seen.has(schema)) return [];
  seen.add(schema);
  return [
    ...(typeof schema.$ref === 'string' ? [schema.$ref] : []),
    ...asArray(schema.allOf).flatMap((branch) => schemaReferences(branch, seen)),
  ];
}

function referencesSchema(schema, name) {
  if (!isObject(schema)) return false;
  const suffix = `#/components/schemas/${name}`;
  return schemaReferences(schema).some((ref) => ref.endsWith(suffix));
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
  return schemaReferences(schema).some(matchesLocalRef);
}
