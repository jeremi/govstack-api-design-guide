import { isObject } from './lib/util.js';
import { collectionShape } from './lib/collectionShape.js';
import responseHeaderRequired from './responseHeaderRequired.js';

/**
 * s07-etagValidator — proxy for guide 7.16: a GET that returns a single
 * resource SHOULD declare an ETag header on its 200 response and a 304
 * response for If-None-Match. Collection responses and pages MAY advertise an
 * ETag, so a GET whose 200 body declares a root array or an `items` array
 * (any media type) is skipped.
 *
 * Does NOT verify: that the ETag is derived from the selected representation,
 * or client If-None-Match support.
 *
 * `given` should select a GET operation object, e.g. `$.paths[*].get`.
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function etagValidator(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(targetVal.responses)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const content = targetVal.responses['200']?.content;
  const schemas = isObject(content)
    ? Object.values(content).filter(isObject).map((media) => media.schema)
    : [];
  if (schemas.some((schema) => collectionShape(schema).isCollection)) return;

  return responseHeaderRequired(
    targetVal.responses,
    { status: '200', headers: ['ETag'], alsoRequireStatus: '304' },
    { path: [...base, 'responses'] },
  );
}
