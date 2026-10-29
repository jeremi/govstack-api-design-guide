import { isObject } from './lib/util.js';

/** Require application/problem+json content on explicit and default errors. */
export default function errorResponseContent(targetVal, _options, context) {
  if (!isObject(targetVal) || !isObject(targetVal.responses)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const isHead = base[base.length - 1] === 'head';
  const results = [];

  for (const [status, response] of Object.entries(targetVal.responses)) {
    if (!(status === 'default' || /^[45](?:[0-9]{2}|XX)$/i.test(status)) || !isObject(response)) continue;
    const responsePath = [...base, 'responses', status];
    if (isHead) {
      if (Object.prototype.hasOwnProperty.call(response, 'content')) {
        results.push({
          message: `HEAD ${status} response must not declare content`,
          path: [...responsePath, 'content'],
        });
      }
      continue;
    }
    if (!isObject(response.content)) {
      results.push({
        message: `${status} error response must declare application/problem+json content`,
        path: responsePath,
      });
      continue;
    }
    const problemEntry = Object.entries(response.content)
      .find(([mediaType]) => /^application\/problem\+json(?:\s*;|$)/.test(mediaType));
    if (!problemEntry) {
      results.push({
        message: `${status} error response content must declare application/problem+json`,
        path: [...responsePath, 'content'],
      });
      continue;
    }
    if (!isObject(problemEntry[1]) || !isObject(problemEntry[1].schema)) {
      results.push({
        message: `${status} application/problem+json content must declare a schema`,
        path: [...responsePath, 'content', problemEntry[0]],
      });
    }
  }

  return results.length ? results : undefined;
}
