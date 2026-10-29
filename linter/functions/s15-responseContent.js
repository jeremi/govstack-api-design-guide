import { isObject } from './lib/util.js';
import { resolvedHttpDocument, walkHttpOperations } from './lib/httpOperations.js';

function inspectAcceptedResponse(response, path, method, findings) {
  if (!isObject(response)) return;
  if (method === 'head') {
    if (Object.hasOwn(response, 'content')) {
      findings.push({
        message: 'HEAD 202 response must not declare content',
        path: [...path, 'content'],
      });
    }
    return;
  }
  if (response.content === undefined) {
    findings.push({
      message: '202 response must declare content with at least one media type having a non-empty schema',
      path,
    });
    return;
  }
  if (!isObject(response.content) || Object.keys(response.content).length === 0) {
    findings.push({
      message: '202 response must declare content with at least one media type having a non-empty schema',
      path: [...path, 'content'],
    });
    return;
  }
  for (const [mediaType, media] of Object.entries(response.content)) {
    if (!isObject(media) || media.schema === undefined) {
      findings.push({
        message: `202 response must declare content media type ${mediaType} with a non-empty schema`,
        path: [...path, 'content', mediaType],
      });
      continue;
    }
    if (!isObject(media.schema) || Object.keys(media.schema).length === 0) {
      findings.push({
        message: `202 response must declare content media type ${mediaType} with a non-empty schema`,
        path: [...path, 'content', mediaType, 'schema'],
      });
    }
  }
}

/** Enforce the response-body declaration required for every non-HEAD 202 response by guide 15.1. */
export default function s15ResponseContent(targetVal, _options, context) {
  const document = resolvedHttpDocument(targetVal, context);
  if (!isObject(document)) return;
  const findings = [];

  walkHttpOperations(document, (operation, { method, path }) => {
    if (isObject(operation.responses) && Object.hasOwn(operation.responses, '202')) {
      inspectAcceptedResponse(
        operation.responses['202'],
        [...path, 'responses', '202'],
        method,
        findings,
      );
    }
  });
  return findings.length ? findings : undefined;
}

