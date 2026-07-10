import { isObject, asArray } from './lib/util.js';

/**
 * s19-localisationHeaders — guide 19.4 proxy: "Responses or messages with
 * localised content MUST include the response language header appropriate to
 * the surface". Whether a response/message actually carries localised
 * content is not decidable from a static document, so this checks the
 * checkable inverse: wherever the localisation *input* signal is present
 * (an `Accept-Language` header parameter, or an `acceptLanguage` message
 * header), the paired *output* language header MUST also be present
 * somewhere it can be.
 *
 * options:
 *   surface {string} required, "openapi" | "asyncapi".
 *     "openapi"  - `given` is one operation object
 *                  (`$.paths[*][get,put,post,delete,patch,...]`). If the
 *                  operation declares an `Accept-Language` header parameter,
 *                  at least one response must declare a `Content-Language`
 *                  header.
 *     "asyncapi" - `given` is one channel object (`$.channels[*]`). Pairing
 *                  is done at the channel level, not per-message: if any
 *                  message on the channel declares an `acceptLanguage`
 *                  header, some message on the same channel must declare
 *                  `contentLanguage`. A per-message check would be wrong,
 *                  since guide 17.9 puts these on *different* messages
 *                  (inbound vs outbound) by design.
 *
 * Does NOT verify: that a response/message lacking the input signal is
 * nonetheless free of localised content — only the converse.
 *
 * @param {unknown} targetVal - an operation (openapi) or a channel (asyncapi).
 * @param {object} options
 * @returns {{message:string}[]|undefined}
 */
export default function localisationHeaders(targetVal, options) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};

  if (opts.surface === 'openapi') {
    const params = asArray(targetVal.parameters);
    const hasAcceptLanguage = params.some(
      (p) =>
        isObject(p) &&
        p.in === 'header' &&
        typeof p.name === 'string' &&
        p.name.toLowerCase() === 'accept-language'
    );
    if (!hasAcceptLanguage) return;

    const responses = targetVal.responses;
    if (!isObject(responses)) return;
    const hasContentLanguage = Object.values(responses).some(
      (resp) => isObject(resp) && isObject(resp.headers) && headerNames(resp.headers).includes('content-language')
    );
    if (hasContentLanguage) return;
    return [
      {
        message:
          'operation declares an Accept-Language parameter but no response declares a Content-Language header',
      },
    ];
  }

  if (opts.surface === 'asyncapi') {
    const messages = targetVal.messages;
    if (!isObject(messages)) return;
    const messageList = Object.values(messages).filter(isObject);
    const hasAcceptLanguage = messageList.some((m) => messageHeaderNames(m).includes('acceptlanguage'));
    if (!hasAcceptLanguage) return;
    const hasContentLanguage = messageList.some((m) => messageHeaderNames(m).includes('contentlanguage'));
    if (hasContentLanguage) return;
    return [
      {
        message:
          'channel has a message declaring acceptLanguage but no message on the channel declares contentLanguage',
      },
    ];
  }

  return undefined;
}

function headerNames(headersObj) {
  return Object.keys(headersObj).map((h) => h.toLowerCase());
}

function messageHeaderNames(message) {
  const schema = isObject(message.headers) ? message.headers : undefined;
  const props = schema && isObject(schema.properties) ? schema.properties : {};
  return Object.keys(props).map((h) => h.toLowerCase());
}
