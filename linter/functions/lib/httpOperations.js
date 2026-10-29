import { isObject } from './util.js';

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Return Spectral's resolved document when available, otherwise the rule target. */
export function resolvedHttpDocument(targetVal, context) {
  const resolved = context?.documentInventory?.resolved;
  return isObject(resolved) ? resolved : targetVal;
}

/**
 * Visit every OpenAPI HTTP operation under paths, webhooks, and callbacks.
 * The active PathItem set prevents recursive references from looping while
 * still visiting a shared PathItem once at each non-recursive use site.
 */
export function walkHttpOperations(document, visit) {
  if (!isObject(document) || typeof visit !== 'function') return;
  const activePathItems = new WeakSet();

  function walkPathItem(pathItem, path) {
    if (!isObject(pathItem) || activePathItems.has(pathItem)) return;
    activePathItems.add(pathItem);
    try {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!isObject(operation)) continue;
        const operationPath = [...path, method];
        visit(operation, {
          method,
          path: operationPath,
          route: String(path[path.length - 1]),
        });

        if (!isObject(operation.callbacks)) continue;
        for (const [callbackName, callback] of Object.entries(operation.callbacks)) {
          if (!isObject(callback)) continue;
          for (const [expression, callbackPathItem] of Object.entries(callback)) {
            walkPathItem(
              callbackPathItem,
              [...operationPath, 'callbacks', callbackName, expression],
            );
          }
        }
      }
    } finally {
      activePathItems.delete(pathItem);
    }
  }

  for (const branch of ['paths', 'webhooks']) {
    if (!isObject(document[branch])) continue;
    for (const [pathKey, pathItem] of Object.entries(document[branch])) {
      walkPathItem(pathItem, [branch, pathKey]);
    }
  }
}

