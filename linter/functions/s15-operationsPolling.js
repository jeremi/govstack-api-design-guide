import { isObject } from './lib/util.js';

const POLL_PATH = /^\/v\d+\/operations\/\{[^}]+\}$/;

/**
 * operationsPolling — proxy for §15.4. When a spec uses the asynchronous
 * Operations pattern, clients poll via `GET /v{N}/operations/{operationId}`.
 * This flags a spec that uses Operations but does not declare that canonical
 * poll endpoint.
 *
 * "Uses Operations" is detected structurally: the document declares a local
 * `components.schemas.Operation` schema, or has any path under `/operations/`.
 * The function deliberately does not inspect the schema's fields or status
 * values; those semantics belong to the BB.
 *
 * It is a proxy: it cannot decide whether asynchronous behaviour is actually
 * needed, and it accepts any version major and any path-parameter name.
 *
 * Given: the document root ($).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function operationsPolling(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  const schemas =
    isObject(targetVal.components) && isObject(targetVal.components.schemas)
      ? targetVal.components.schemas
      : {};

  const pathKeys = Object.keys(paths);
  const usesOperations =
    isObject(schemas.Operation) ||
    pathKeys.some((k) => k.includes('/operations/') || k.endsWith('/operations'));
  if (!usesOperations) return;

  const hasPoll = Object.entries(paths).some(
    ([k, v]) => POLL_PATH.test(k) && isObject(v) && isObject(v.get),
  );
  if (hasPoll) return;

  return [{
    message:
      'the Operations pattern is used but no canonical poll endpoint ' +
      'GET /v{N}/operations/{operationId} is declared',
    path: [...base, 'paths'],
  }];
}
