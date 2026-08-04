import { isObject, asArray } from './lib/util.js';

/**
 * schemeExists — assert the document declares at least one security scheme
 * matching a required profile. Drives the §13.2 and §13.3 proxies:
 *   - §13.2: an OAuth 2.0 / OpenID Connect scheme exists.
 *   - §13.3: a service-to-service scheme exists (mTLS, or OAuth
 *     client-credentials).
 *
 * It only checks that such a scheme is *declared* under
 * `components.securitySchemes`; it does NOT verify that the scheme is applied to
 * the right (citizen-facing vs inter-BB) operations, which the guide leaves to
 * human review.
 *
 * Given: the document root ($). Reads `components.securitySchemes`.
 *
 * options:
 *   types      {string[]} scheme `type` values accepted unconditionally
 *                         (e.g. ["openIdConnect","oauth2"] or ["mutualTLS"]).
 *   oauthFlows {string[]} if present, a `type: oauth2` scheme also matches when
 *                         it declares at least one of these flow names under
 *                         `flows` (e.g. ["clientCredentials"]).
 *   httpBearerFormats {string[]} if present, a `type: http` scheme with
 *                         `scheme: bearer` also matches when its `bearerFormat`
 *                         is one of these (e.g. ["JWT"]). This is the §13.2
 *                         resource-server case: an API that validates tokens
 *                         from an authorization server it does not own would
 *                         misdescribe itself by declaring an oauth2 flow.
 *   label      {string}   human label used in the message.
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function schemeExists(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const types = asArray(opts.types).filter((t) => typeof t === 'string');
  const oauthFlows = asArray(opts.oauthFlows).filter((f) => typeof f === 'string');
  const httpBearerFormats = asArray(opts.httpBearerFormats).filter((f) => typeof f === 'string');
  const label = typeof opts.label === 'string' ? opts.label : 'a matching';

  const components = isObject(targetVal.components) ? targetVal.components : {};
  const schemes = isObject(components.securitySchemes) ? components.securitySchemes : {};

  const matches = (scheme) => {
    if (!isObject(scheme)) return false;
    const t = scheme.type;
    if (typeof t === 'string' && types.includes(t)) return true;
    if (t === 'oauth2' && oauthFlows.length && isObject(scheme.flows)) {
      return oauthFlows.some((f) => isObject(scheme.flows[f]));
    }
    if (t === 'http' && httpBearerFormats.length && scheme.scheme === 'bearer') {
      return httpBearerFormats.includes(scheme.bearerFormat);
    }
    return false;
  };

  const found = Object.values(schemes).some(matches);
  if (found) return;

  const target = isObject(components.securitySchemes)
    ? [...base, 'components', 'securitySchemes']
    : [...base];
  return [{ message: `no ${label} security scheme is declared under components.securitySchemes`, path: target }];
}
