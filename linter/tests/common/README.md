# Shared component fixtures

These two files are test fixtures, not a source of truth. They are byte-for-byte copies of the shared GovStack components that a BB repository carries under `api/common/` (the `bb-template` scaffold), whose incubation home is [`jeremi/govstack-api-common`](https://github.com/jeremi/govstack-api-common). The golden specs and the linter tests resolve their `$ref`s against them so the test suite runs without a BB checkout.

When the shared components change, copy the new versions here and rerun `npm test` in `linter/`.
