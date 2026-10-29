import { isObject } from './lib/util.js';

const VALID_TYPES = new Set([
  'null',
  'boolean',
  'object',
  'array',
  'number',
  'string',
  'integer',
]);

const SUPPORTED_DIALECTS = new Set([
  'https://json-schema.org/draft/2020-12/schema',
  'https://spec.openapis.org/oas/3.1/dialect/base',
]);

const OPERATIONS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const SCHEMA_MAP_KEYS = [
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
];
const SCHEMA_ARRAY_KEYS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const SCHEMA_SINGLE_KEYS = [
  'additionalProperties',
  'unevaluatedProperties',
  'additionalItems',
  'unevaluatedItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
  'contentSchema',
];

function normaliseDialect(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/#$/, '').replace(/\/$/, '');
}

function supportsDialect(value) {
  return value === undefined || SUPPORTED_DIALECTS.has(normaliseDialect(value));
}

function entries(value) {
  return isObject(value) ? Object.entries(value) : [];
}

/**
 * schemaTypes — validate JSON Schema `type` keywords in OpenAPI 3.1 Schema
 * Object positions.
 *
 * The function receives the whole OpenAPI document so it can distinguish
 * Schema Objects from unrelated objects that happen to contain a domain field
 * named `type`. Spectral resolves references before invoking the function, so
 * schemas reached through local or external references are checked too.
 *
 * A schema that opts into an unknown `$schema` dialect is left to that
 * dialect's validator. The standard JSON Schema 2020-12 and OpenAPI 3.1 base
 * dialects are checked. Boolean schemas are valid and need no further walk.
 *
 * @param {unknown} targetVal - an OpenAPI document.
 * @param {object} _options - reserved for future options.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function schemaTypes(targetVal, _options, context) {
  if (!isObject(targetVal)) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  const findings = [];
  const seenSchemas = new WeakSet();
  const documentDialect = targetVal.jsonSchemaDialect;

  const reportType = (type, path) => {
    if (typeof type === 'string') {
      if (!VALID_TYPES.has(type)) {
        findings.push({
          message: `schema type "${type}" is not a JSON Schema primitive type`,
          path: [...base, ...path],
        });
      }
      return;
    }

    if (!Array.isArray(type)) {
      findings.push({
        message: 'schema type must be a primitive type name or a non-empty array of unique primitive type names',
        path: [...base, ...path],
      });
      return;
    }

    if (type.length === 0) {
      findings.push({ message: 'schema type array must not be empty', path: [...base, ...path] });
      return;
    }

    const seenTypes = new Set();
    type.forEach((member, index) => {
      if (typeof member !== 'string') {
        findings.push({
          message: 'schema type array members must be primitive type names',
          path: [...base, ...path, index],
        });
      } else if (!VALID_TYPES.has(member)) {
        findings.push({
          message: `schema type "${member}" is not a JSON Schema primitive type`,
          path: [...base, ...path, index],
        });
      } else if (seenTypes.has(member)) {
        findings.push({
          message: `schema type array must contain unique members; "${member}" is duplicated`,
          path: [...base, ...path],
        });
      }
      seenTypes.add(member);
    });
  };

  const visitSchema = (schema, path, inheritedDialect = documentDialect) => {
    if (typeof schema === 'boolean' || !isObject(schema) || seenSchemas.has(schema)) return;

    const dialect = Object.hasOwn(schema, '$schema') ? schema.$schema : inheritedDialect;
    if (!supportsDialect(dialect)) return;
    seenSchemas.add(schema);

    if (Object.hasOwn(schema, 'type')) reportType(schema.type, [...path, 'type']);

    for (const key of SCHEMA_MAP_KEYS) {
      for (const [name, child] of entries(schema[key])) {
        visitSchema(child, [...path, key, name], dialect);
      }
    }
    for (const key of SCHEMA_ARRAY_KEYS) {
      if (!Array.isArray(schema[key])) continue;
      schema[key].forEach((child, index) => visitSchema(child, [...path, key, index], dialect));
    }
    for (const key of SCHEMA_SINGLE_KEYS) {
      if (Object.hasOwn(schema, key)) visitSchema(schema[key], [...path, key], dialect);
    }

    if (Array.isArray(schema.items)) {
      schema.items.forEach((child, index) => visitSchema(child, [...path, 'items', index], dialect));
    } else if (Object.hasOwn(schema, 'items')) {
      visitSchema(schema.items, [...path, 'items'], dialect);
    }

    // Draft-07 dependencies may contain either property-name arrays or schemas.
    for (const [name, dependency] of entries(schema.dependencies)) {
      if (!Array.isArray(dependency)) {
        visitSchema(dependency, [...path, 'dependencies', name], dialect);
      }
    }
  };

  const visitMediaType = (mediaType, path) => {
    if (!isObject(mediaType)) return;
    if (Object.hasOwn(mediaType, 'schema')) {
      visitSchema(mediaType.schema, [...path, 'schema']);
    }
    for (const [name, encoding] of entries(mediaType.encoding)) {
      for (const [headerName, header] of entries(encoding && encoding.headers)) {
        visitHeader(header, [...path, 'encoding', name, 'headers', headerName]);
      }
    }
  };

  const visitContent = (content, path) => {
    for (const [mediaType, value] of entries(content)) {
      visitMediaType(value, [...path, mediaType]);
    }
  };

  const visitParameterLike = (parameter, path) => {
    if (!isObject(parameter)) return;
    if (Object.hasOwn(parameter, 'schema')) {
      visitSchema(parameter.schema, [...path, 'schema']);
    }
    visitContent(parameter.content, [...path, 'content']);
  };

  const visitHeader = (header, path) => visitParameterLike(header, path);
  const visitParameter = (parameter, path) => visitParameterLike(parameter, path);

  const visitRequestBody = (requestBody, path) => {
    if (!isObject(requestBody)) return;
    visitContent(requestBody.content, [...path, 'content']);
  };

  const visitResponse = (response, path) => {
    if (!isObject(response)) return;
    visitContent(response.content, [...path, 'content']);
    for (const [name, header] of entries(response.headers)) {
      visitHeader(header, [...path, 'headers', name]);
    }
  };

  const seenPathItems = new WeakSet();
  const visitOperation = (operation, path) => {
    if (!isObject(operation)) return;
    if (Array.isArray(operation.parameters)) {
      operation.parameters.forEach((parameter, index) => {
        visitParameter(parameter, [...path, 'parameters', index]);
      });
    }
    if (Object.hasOwn(operation, 'requestBody')) {
      visitRequestBody(operation.requestBody, [...path, 'requestBody']);
    }
    for (const [status, response] of entries(operation.responses)) {
      visitResponse(response, [...path, 'responses', status]);
    }
    for (const [name, callback] of entries(operation.callbacks)) {
      for (const [expression, pathItem] of entries(callback)) {
        visitPathItem(pathItem, [...path, 'callbacks', name, expression]);
      }
    }
  };

  const visitPathItem = (pathItem, path) => {
    if (!isObject(pathItem) || seenPathItems.has(pathItem)) return;
    seenPathItems.add(pathItem);
    if (Array.isArray(pathItem.parameters)) {
      pathItem.parameters.forEach((parameter, index) => {
        visitParameter(parameter, [...path, 'parameters', index]);
      });
    }
    for (const method of OPERATIONS) {
      if (Object.hasOwn(pathItem, method)) {
        visitOperation(pathItem[method], [...path, method]);
      }
    }
  };

  for (const [route, pathItem] of entries(targetVal.paths)) {
    visitPathItem(pathItem, ['paths', route]);
  }
  for (const [name, pathItem] of entries(targetVal.webhooks)) {
    visitPathItem(pathItem, ['webhooks', name]);
  }

  const components = isObject(targetVal.components) ? targetVal.components : {};
  for (const [name, schema] of entries(components.schemas)) {
    visitSchema(schema, ['components', 'schemas', name]);
  }
  for (const [name, parameter] of entries(components.parameters)) {
    visitParameter(parameter, ['components', 'parameters', name]);
  }
  for (const [name, header] of entries(components.headers)) {
    visitHeader(header, ['components', 'headers', name]);
  }
  for (const [name, requestBody] of entries(components.requestBodies)) {
    visitRequestBody(requestBody, ['components', 'requestBodies', name]);
  }
  for (const [name, response] of entries(components.responses)) {
    visitResponse(response, ['components', 'responses', name]);
  }
  for (const [name, callback] of entries(components.callbacks)) {
    for (const [expression, pathItem] of entries(callback)) {
      visitPathItem(pathItem, ['components', 'callbacks', name, expression]);
    }
  }
  for (const [name, pathItem] of entries(components.pathItems)) {
    visitPathItem(pathItem, ['components', 'pathItems', name]);
  }

  return findings.length ? findings : undefined;
}
