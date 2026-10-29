import responseHeaderRequired from './responseHeaderRequired.js';
import { resolvedHttpDocument, walkHttpOperations } from './lib/httpOperations.js';
import { isObject } from './lib/util.js';

/** Apply the existing Location-header check to every OpenAPI HTTP operation. */
export default function responseLocation(targetVal, options, context) {
  const document = resolvedHttpDocument(targetVal, context);
  if (!isObject(document)) return;
  const findings = [];

  walkHttpOperations(document, (operation, { path }) => {
    if (!isObject(operation.responses)) return;
    const operationFindings = responseHeaderRequired(
      operation.responses,
      { status: options?.status, headers: ['Location'] },
      { path: [...path, 'responses'] },
    );
    if (operationFindings) findings.push(...operationFindings);
  });

  return findings.length ? findings : undefined;
}

