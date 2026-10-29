import { isObject } from './lib/util.js';
import { resolvedHttpDocument, walkHttpOperations } from './lib/httpOperations.js';

/** Enforce the deterministic successful-response schema clauses of guide 7.21. */
export default function genericSuccessResponseSchema(targetVal, _options, context) {
  const document = resolvedHttpDocument(targetVal, context);
  if (!isObject(document)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  walkHttpOperations(document, (operation, { method, path, route }) => {
    if (!isObject(operation.responses)) return;
    for (const [status, response] of Object.entries(operation.responses)) {
      if (!/^2\d\d$/.test(status) || !isObject(response)) continue;
      if (status === '202') continue; // §15.1 owns the more specific Operation response contract.
      const responsePath = [...base, ...path, 'responses', status];
      if (method === 'head' || status === '204' || status === '205') {
        if (Object.hasOwn(response, 'content')) {
          results.push({
            message: `${method.toUpperCase()} ${route} response ${status} must not declare content`,
            path: [...responsePath, 'content'],
          });
        }
        continue;
      }
      if (response.content === undefined) continue;
      if (!isObject(response.content) || Object.keys(response.content).length === 0) {
        results.push({
          message: `${method.toUpperCase()} ${route} response ${status} content must declare at least one media type schema`,
          path: [...responsePath, 'content'],
        });
        continue;
      }
      for (const [mediaType, media] of Object.entries(response.content)) {
        if (!isObject(media) || !isObject(media.schema) || Object.keys(media.schema).length === 0) {
          results.push({
            message: `${method.toUpperCase()} ${route} response ${status} media type ${mediaType} must declare a non-empty schema`,
            path: [...responsePath, 'content', mediaType],
          });
        }
      }
    }
  });
  return results.length ? results : undefined;
}
