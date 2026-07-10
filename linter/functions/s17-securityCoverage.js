import { isObject } from './lib/util.js';

/**
 * s17-securityCoverage — §17.10 AsyncAPI security covers every operation.
 *
 * Given: the whole RESOLVED AsyncAPI 3.0 document (`$`). Resolution turns each
 * operation's `channel` `$ref` into the channel object and each server/operation
 * `security` `$ref` into the scheme object, which this walk relies on.
 *
 * Asserts:
 *   - `components.securitySchemes` declares at least one scheme, and
 *   - every operation is covered: it declares a non-empty operation-level
 *     `security`, OR every server applicable to its channel declares a non-empty
 *     `security`. In AsyncAPI 3.0 `security` is a list of security scheme
 *     objects/references; a non-empty list counts as "secured".
 *
 * Applicable servers = the channel's `servers` list when present, otherwise all
 * document servers. Message signing (§16.5) is deliberately NOT treated as a
 * substitute here: only `servers`/`operations` security counts.
 *
 * options: none.
 * @param {unknown} targetVal - the document root ($).
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17SecurityCoverage(targetVal, _options, context) {
  const root = targetVal;
  if (!isObject(root) || !isObject(root.operations)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const schemes = isObject(root.components) ? root.components.securitySchemes : undefined;
  if (!isObject(schemes) || Object.keys(schemes).length === 0) {
    results.push({
      message: 'AsyncAPI security schemes must be declared under components.securitySchemes',
      path: [...base, 'components', 'securitySchemes'],
    });
  }

  const allServers = isObject(root.servers) ? Object.values(root.servers) : [];
  const secured = (srv) => isObject(srv) && Array.isArray(srv.security) && srv.security.length > 0;

  for (const [opId, op] of Object.entries(root.operations)) {
    if (!isObject(op)) continue;
    if (Array.isArray(op.security) && op.security.length > 0) continue; // operation-level security

    const channel = op.channel;
    const channelServers =
      isObject(channel) && Array.isArray(channel.servers) && channel.servers.length > 0
        ? channel.servers
        : allServers;

    const covered = channelServers.length > 0 && channelServers.every(secured);
    if (!covered) {
      results.push({
        message: `operation "${opId}" is not covered by a security scheme: it declares no operation-level security and its applicable server(s) declare none`,
        path: [...base, 'operations', opId],
      });
    }
  }

  return results.length ? results : undefined;
}
