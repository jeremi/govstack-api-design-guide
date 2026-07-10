import { isObject } from './lib/util.js';
import { walkSchema } from './lib/schemaWalk.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** True if a media-type object (or its schema) carries at least one example. */
function hasExample(mediaTypeObj) {
  if (!isObject(mediaTypeObj)) return false;
  if ('example' in mediaTypeObj) return true;
  if (isObject(mediaTypeObj.examples) && Object.keys(mediaTypeObj.examples).length > 0) return true;
  const schema = mediaTypeObj.schema;
  if (isObject(schema)) {
    if ('example' in schema) return true;
    if (Array.isArray(schema.examples) && schema.examples.length > 0) return true;
  }
  return false;
}

/** Push a finding if none of a `content` map's media types carries an example. */
function checkContent(content, path, label, results) {
  if (!isObject(content)) return;
  const mediaTypes = Object.keys(content);
  if (mediaTypes.length === 0) return;
  if (!mediaTypes.some((mt) => hasExample(content[mt]))) {
    results.push({ message: `${label} must have at least one example`, path });
  }
}

/**
 * Push a finding for every `enum` schema node lacking a `description`. PROXY:
 * "has a description" substitutes for "documents what the values mean" - a
 * description that doesn't actually explain the enum values still passes.
 */
function checkEnums(schema, path, results) {
  if (!isObject(schema)) return;
  walkSchema(schema, (node, subPath) => {
    if (Array.isArray(node.enum) && node.enum.length > 0 && typeof node.description !== 'string') {
      results.push({
        message: `enum at ${[...path, ...subPath].join('/') || '(root)'} must document what its values mean (add a description)`,
        path: [...path, ...subPath],
      });
    }
  });
}

/**
 * bodyExamplesAndEnums — guide 4.2 (proxy): every request/response body (and
 * AsyncAPI message) MUST have at least one example; every `enum` MUST
 * document what its values mean.
 *
 * PROXY: the enum check substitutes "has a non-empty description" for
 * "documents what the values mean" per the guide's own carve-out ("an
 * example alone is insufficient when the values are not self-explanatory") -
 * it cannot verify the description actually explains the values.
 *
 * `given` should be `$` (the root document); OpenAPI paths and AsyncAPI
 * components.messages are both scanned so one rule covers either surface.
 *
 * @param {unknown} targetVal - the root document.
 * @param {object} options - unused.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function bodyExamplesAndEnums(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  if (isObject(targetVal.paths)) {
    for (const [pathKey, pathItem] of Object.entries(targetVal.paths)) {
      if (!isObject(pathItem)) continue;
      for (const method of HTTP_METHODS) {
        const op = pathItem[method];
        if (!isObject(op)) continue;
        const opPath = [...base, 'paths', pathKey, method];

        if (isObject(op.requestBody)) {
          const reqContent = op.requestBody.content;
          const reqPath = [...opPath, 'requestBody', 'content'];
          checkContent(reqContent, reqPath, `${method.toUpperCase()} ${pathKey} request body`, results);
          if (isObject(reqContent)) {
            for (const mt of Object.keys(reqContent)) {
              if (isObject(reqContent[mt])) checkEnums(reqContent[mt].schema, [...reqPath, mt, 'schema'], results);
            }
          }
        }

        if (isObject(op.responses)) {
          for (const [status, response] of Object.entries(op.responses)) {
            if (!isObject(response)) continue;
            const respPath = [...opPath, 'responses', status, 'content'];
            checkContent(response.content, respPath, `${method.toUpperCase()} ${pathKey} ${status} response body`, results);
            if (isObject(response.content)) {
              for (const mt of Object.keys(response.content)) {
                if (isObject(response.content[mt])) checkEnums(response.content[mt].schema, [...respPath, mt, 'schema'], results);
              }
            }
          }
        }
      }
    }
  }

  if (isObject(targetVal.components) && isObject(targetVal.components.messages)) {
    for (const [name, message] of Object.entries(targetVal.components.messages)) {
      if (!isObject(message)) continue;
      const msgPath = [...base, 'components', 'messages', name];
      const examples = message.examples;
      if (!Array.isArray(examples) || examples.length === 0) {
        results.push({ message: `message "${name}" must have at least one example`, path: msgPath });
      }
      checkEnums(message.payload, [...msgPath, 'payload'], results);
    }
  }

  return results.length ? results : undefined;
}
