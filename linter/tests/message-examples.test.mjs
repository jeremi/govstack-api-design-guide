import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenPath = path.join(here, 'golden/asyncapi-golden.yaml');
const commonPath = path.resolve(here, '../../../api/common/govstack-asyncapi-common.yaml');
const golden = YAML.parse(await readFile(goldenPath, 'utf8'));
const common = YAML.parse(await readFile(commonPath, 'utf8'));

function atPointer(root, fragment) {
  return fragment
    .replace(/^#\//, '')
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], root);
}

function dereference(value, sourceRoot = golden) {
  if (Array.isArray(value)) return value.map((item) => dereference(item, sourceRoot));
  if (value === null || typeof value !== 'object') return value;

  if (typeof value.$ref === 'string') {
    const [file, fragment = ''] = value.$ref.split('#');
    const refRoot = file.includes('govstack-asyncapi-common.yaml') ? common : sourceRoot;
    const target = atPointer(refRoot, `#${fragment}`);
    assert.ok(target, `Unresolved schema reference in golden example test: ${value.$ref}`);
    return dereference(target, refRoot);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, dereference(child, sourceRoot)]),
  );
}

test('every AsyncAPI golden payload example satisfies its composed schema', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  for (const [messageName, message] of Object.entries(golden.components.messages)) {
    const validate = ajv.compile(dereference(message.payload));
    for (const example of message.examples ?? []) {
      const valid = validate(example.payload);
      assert.equal(
        valid,
        true,
        `${messageName}/${example.name} does not satisfy its payload schema:\n${JSON.stringify(validate.errors, null, 2)}`,
      );
    }
  }
});
