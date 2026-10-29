import { isObject, asArray } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * s12-fieldsParam: guide 12.10: the query parameter name `fields` is reserved
 * for top-level response field selection. When an operation declares it, it
 * MUST be an optional query parameter serialised as one comma-separated list
 * of top-level property names (not an enum view switch), and the operation
 * MUST declare a `400` response for unknown names (a `4XX` range response also
 * documents 400 and is accepted).
 *
 * Two schema shapes serialise as that list: a string, which carries no
 * `enum`; or an array of strings with `style: form` (the query default) and
 * `explode: false`, whose items MAY carry an `enum` of the selectable names.
 * Form style explodes by default, so the array form needs `explode: false`
 * stated explicitly. `allOf` branches are read together, so a shared selection
 * schema narrowed per deployment is accepted.
 *
 * No-op for operations without a `fields` query parameter. Path-item
 * parameters apply to every operation of that path unless the operation
 * overrides them (same name and location).
 *
 * Does NOT verify: that the comma-separated values are top-level property
 * names, which properties are always returned, the Problem `type` returned on
 * an unknown name, or that selection never widens authorisation (runtime).
 *
 * `given` should be `$.paths`.
 *
 * @param {unknown} targetVal - the OpenAPI `paths` object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
/**
 * The schema and its `allOf` branches, recursively: the parts whose
 * constraints all apply to the same value.
 * @param {object} schema
 * @returns {object[]}
 */
function allOfParts(schema) {
  const branches = asArray(schema.allOf).filter(isObject);
  return [schema, ...branches.flatMap(allOfParts)];
}

export default function fieldsParam(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  for (const [route, pathItem] of Object.entries(targetVal)) {
    if (!isObject(pathItem)) continue;
    const pathParams = asArray(pathItem.parameters);
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      const opPath = [...base, route, method];
      const opParams = asArray(operation.parameters);

      let param;
      let paramPath;
      const opIndex = opParams.findIndex((p) => isObject(p) && p.name === 'fields' && p.in === 'query');
      if (opIndex >= 0) {
        param = opParams[opIndex];
        paramPath = [...opPath, 'parameters', opIndex];
      } else {
        const pathIndex = pathParams.findIndex((p) => isObject(p) && p.name === 'fields' && p.in === 'query');
        if (pathIndex < 0) continue;
        param = pathParams[pathIndex];
        paramPath = [...base, route, 'parameters', pathIndex];
      }

      const schema = isObject(param.schema) ? param.schema : {};
      const parts = allOfParts(schema);
      const types = new Set(parts.flatMap((part) => asArray(part.type)));
      if (types.size === 1 && types.has('array')) {
        const items = parts.filter((part) => part.items !== undefined).map((part) => part.items);
        const itemParts = items.flatMap((item) => (isObject(item) ? allOfParts(item) : [{}]));
        const itemTypes = new Set(itemParts.flatMap((part) => asArray(part.type)));
        if (itemParts.length === 0 || itemTypes.size !== 1 || !itemTypes.has('string')) {
          results.push({
            message: '"fields" query parameter array items must be strings (top-level property names)',
            path: [...paramPath, 'schema'],
          });
        }
        if ((param.style !== undefined && param.style !== 'form') || param.explode !== false) {
          results.push({
            message: '"fields" array query parameter must use style: form with explode: false (one comma-separated value)',
            path: paramPath,
          });
        }
      } else if (types.size !== 1 || !types.has('string')) {
        results.push({
          message: '"fields" query parameter must be a string, or an array of strings with explode: false (comma-separated top-level property names)',
          path: [...paramPath, 'schema'],
        });
      }
      if (parts.some((part) => part.enum !== undefined)) {
        results.push({
          message: '"fields" query parameter must not be an enum view switch; it lists top-level property names',
          path: schema.enum !== undefined ? [...paramPath, 'schema', 'enum'] : [...paramPath, 'schema'],
        });
      }
      if (param.required === true) {
        results.push({
          message: '"fields" query parameter must be optional',
          path: [...paramPath, 'required'],
        });
      }
      const responses = isObject(operation.responses) ? operation.responses : {};
      if (!('400' in responses) && !('4XX' in responses) && !('4xx' in responses)) {
        results.push({
          message: `${method.toUpperCase()} ${route} declares "fields" and must declare a 400 response for unknown field names`,
          path: [...opPath, 'responses'],
        });
      }
    }
  }

  return results.length ? results : undefined;
}
