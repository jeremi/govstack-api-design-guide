import { walkSchema } from './schemaWalk.js';
import { isObject, asArray } from './util.js';

const SELECTOR_NAMES = new Set(['sort', 'fields']);
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const analysisCache = new WeakMap();

/** Enum nodes reached through wrappers that preserve a selector value. */
function collectSelectorEnums(schema, selectorEnums, seen = new WeakSet()) {
  if (!isObject(schema) || seen.has(schema)) return;
  seen.add(schema);
  if (Array.isArray(schema.enum)) selectorEnums.add(schema);

  for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
    if (!Array.isArray(schema[key])) continue;
    for (const branch of schema[key]) collectSelectorEnums(branch, selectorEnums, seen);
  }
  for (const item of asArray(schema.items)) collectSelectorEnums(item, selectorEnums, seen);
}

/** Selector properties only count inside schemas reached from actual inputs. */
function collectBodySelectors(schema, selectorEnums) {
  walkSchema(schema, (node) => {
    if (!isObject(node.properties)) return;
    for (const [name, propertySchema] of Object.entries(node.properties)) {
      if (SELECTOR_NAMES.has(name)) collectSelectorEnums(propertySchema, selectorEnums);
    }
  }, { skipKeys: ['not'] });
}

function collectParameterSelector(parameter, selectorEnums) {
  if (!isObject(parameter) || parameter.in !== 'query' || !SELECTOR_NAMES.has(parameter.name)) return;
  collectSelectorEnums(parameter.schema, selectorEnums);
}

function collectRequestSelectors(pathItem, selectorEnums) {
  if (!isObject(pathItem)) return;
  for (const parameter of asArray(pathItem.parameters)) {
    collectParameterSelector(parameter, selectorEnums);
  }
  for (const method of METHODS) {
    const operation = pathItem[method];
    if (!isObject(operation)) continue;
    for (const parameter of asArray(operation.parameters)) {
      collectParameterSelector(parameter, selectorEnums);
    }
    if (!isObject(operation.requestBody?.content)) continue;
    for (const mediaType of Object.values(operation.requestBody.content)) {
      if (isObject(mediaType)) collectBodySelectors(mediaType.schema, selectorEnums);
    }
  }
}

function markEmittedSchema(schema, emittedEnums) {
  walkSchema(schema, (node) => {
    if (Array.isArray(node.enum)) emittedEnums.add(node);
  }, { skipKeys: ['not'] });
}

function markRequestBody(requestBody, emittedEnums) {
  if (!isObject(requestBody?.content)) return;
  for (const mediaType of Object.values(requestBody.content)) {
    if (isObject(mediaType)) markEmittedSchema(mediaType.schema, emittedEnums);
  }
}

function markOutboundPathItem(pathItem, emittedEnums, seen = new WeakSet()) {
  if (!isObject(pathItem) || seen.has(pathItem)) return;
  seen.add(pathItem);
  for (const parameter of asArray(pathItem.parameters)) {
    if (isObject(parameter)) markEmittedSchema(parameter.schema, emittedEnums);
  }
  for (const method of METHODS) {
    const operation = pathItem[method];
    if (!isObject(operation)) continue;
    for (const parameter of asArray(operation.parameters)) {
      if (isObject(parameter)) markEmittedSchema(parameter.schema, emittedEnums);
    }
    markRequestBody(operation.requestBody, emittedEnums);
  }
}

function markPathEmissions(pathItem, emittedEnums, seenOutbound) {
  if (!isObject(pathItem)) return;
  for (const method of METHODS) {
    const operation = pathItem[method];
    if (!isObject(operation)) continue;
    if (isObject(operation.responses)) {
      for (const response of Object.values(operation.responses)) {
        if (!isObject(response?.content)) continue;
        for (const mediaType of Object.values(response.content)) {
          if (isObject(mediaType)) markEmittedSchema(mediaType.schema, emittedEnums);
        }
      }
    }
    if (!isObject(operation.callbacks)) continue;
    for (const callback of Object.values(operation.callbacks)) {
      if (!isObject(callback)) continue;
      for (const callbackPathItem of Object.values(callback)) {
        markOutboundPathItem(callbackPathItem, emittedEnums, seenOutbound);
      }
    }
  }
}

function analyze(context) {
  const inventory = context && context.documentInventory;
  if (!inventory || !isObject(inventory.resolved)) {
    return { selectorEnums: new WeakSet(), emittedEnums: new WeakSet() };
  }
  if (analysisCache.has(inventory)) return analysisCache.get(inventory);

  const document = inventory.resolved;
  const selectorEnums = new WeakSet();
  const emittedEnums = new WeakSet();
  const result = { selectorEnums, emittedEnums };
  analysisCache.set(inventory, result);

  if (isObject(document.paths)) {
    const seenOutbound = new WeakSet();
    for (const pathItem of Object.values(document.paths)) {
      collectRequestSelectors(pathItem, selectorEnums);
      markPathEmissions(pathItem, emittedEnums, seenOutbound);
    }
  }
  if (isObject(document.webhooks)) {
    const seenOutbound = new WeakSet();
    for (const pathItem of Object.values(document.webhooks)) {
      markOutboundPathItem(pathItem, emittedEnums, seenOutbound);
    }
  }

  // AsyncAPI has no OpenAPI selector inputs. Marking message payloads keeps any
  // future cross-format reuse conservative: emitted vocabularies are not input-only.
  if (isObject(document.components?.messages)) {
    for (const message of Object.values(document.components.messages)) {
      if (isObject(message)) markEmittedSchema(message.payload, emittedEnums);
    }
  }
  return result;
}

/** Whether this exact enum node is an actual `sort` or `fields` selector. */
export function isSelectorEnum(context, enumSchema) {
  return isObject(enumSchema) && analyze(context).selectorEnums.has(enumSchema);
}

/** Whether this exact selector enum is accepted as input and never emitted. */
export function isRequestOnlySelectorEnum(context, enumSchema) {
  if (!isObject(enumSchema)) return false;
  const { selectorEnums, emittedEnums } = analyze(context);
  return selectorEnums.has(enumSchema) && !emittedEnums.has(enumSchema);
}
