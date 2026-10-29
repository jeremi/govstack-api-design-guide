import { test } from 'node:test';
import assert from 'node:assert/strict';

import pathSegments from '../functions/pathSegments.js';

const depthFindings = (paths) =>
  pathSegments(paths, { check: 'maxDepthAfterVersion', max: 2 }, { path: ['paths'] }) ?? [];

const collectionOperation = (collection) => ({
  get: {
    'x-govstack-digital-registries': { collection },
  },
});

test('a bare sibling parameterized path does not prove a literal identifier', () => {
  const paths = {
    '/v1/events/{eventId}/results': {},
    '/v1/events/archive/results': {},
  };

  assert.deepEqual(
    depthFindings(paths).map((finding) => finding.path.at(-1)),
    ['/v1/events/archive/results'],
  );
});

test('Digital Registries collection metadata is a bounded no-template fallback', () => {
  const paths = {
    '/v1/collections/businesses/records/{recordId}': collectionOperation('businesses'),
    '/v1/collections/businesses/records': collectionOperation('businesses'),
    '/v1/collections/businesses/lookup': collectionOperation('businesses'),
    '/v1/collections/businesses/search': collectionOperation('businesses'),
  };

  assert.deepEqual(depthFindings(paths), []);
});

test('collection metadata must match and agree across operations', () => {
  const paths = {
    '/v1/collections/businesses/records': collectionOperation('households'),
    '/v1/collections/households/records': {
      get: { 'x-govstack-digital-registries': { collection: 'households' } },
      post: { 'x-govstack-digital-registries': { collection: 'businesses' } },
    },
  };

  assert.deepEqual(
    depthFindings(paths).map((finding) => finding.path.at(-1)),
    [
      '/v1/collections/businesses/records',
      '/v1/collections/households/records',
    ],
  );
});

test('fixed collection evidence does not hide unrelated depth or action levels', () => {
  const paths = {
    '/v1/collections/businesses/departments/employees': collectionOperation('businesses'),
    '/v1/collections/businesses/search/results': collectionOperation('businesses'),
    '/v1/events/{eventId}/results': {},
    '/v1/events/search/results': {},
    '/v1/events/lookup/results': {},
    '/v1/events/cancel/results': {},
    '/v1/events/rotate-secret/results': {},
  };

  assert.deepEqual(
    depthFindings(paths).map((finding) => finding.path.at(-1)),
    [
      '/v1/collections/businesses/departments/employees',
      '/v1/collections/businesses/search/results',
      '/v1/events/search/results',
      '/v1/events/lookup/results',
      '/v1/events/cancel/results',
      '/v1/events/rotate-secret/results',
    ],
  );
});

test('revision sub-resources remain genuinely deep with fixed collection identifiers', () => {
  const paths = {
    '/v1/collections/birth-registrations/records/{recordId}/revisions':
      collectionOperation('birth-registrations'),
    '/v1/collections/birth-registrations/records/{recordId}/revisions/{revisionId}':
      collectionOperation('birth-registrations'),
  };

  assert.equal(depthFindings(paths).length, 2);
});

test('reviewed Digital Registries shapes remove seven false warnings and retain four revisions', () => {
  const paths = {
    '/v1/collections/{collectionId}/records/{recordId}/revisions': {},
    '/v1/collections/{collectionId}/records/{recordId}/revisions/{revisionId}': {},
    '/v1/collections/businesses/records/{recordId}': collectionOperation('businesses'),
    '/v1/collections/businesses/records': collectionOperation('businesses'),
    '/v1/collections/businesses/lookup': collectionOperation('businesses'),
    '/v1/collections/businesses/search': collectionOperation('businesses'),
    '/v1/collections/households/records/{recordId}': collectionOperation('households'),
    '/v1/collections/birth-registrations/records/{recordId}':
      collectionOperation('birth-registrations'),
    '/v1/collections/birth-registrations/search': collectionOperation('birth-registrations'),
    '/v1/collections/birth-registrations/records/{recordId}/revisions':
      collectionOperation('birth-registrations'),
    '/v1/collections/birth-registrations/records/{recordId}/revisions/{revisionId}':
      collectionOperation('birth-registrations'),
  };

  assert.deepEqual(
    depthFindings(paths).map((finding) => finding.path.at(-1)),
    [
      '/v1/collections/{collectionId}/records/{recordId}/revisions',
      '/v1/collections/{collectionId}/records/{recordId}/revisions/{revisionId}',
      '/v1/collections/birth-registrations/records/{recordId}/revisions',
      '/v1/collections/birth-registrations/records/{recordId}/revisions/{revisionId}',
    ],
  );
});
