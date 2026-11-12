---
description: "The commands to run against a BB's OpenAPI or AsyncAPI file, and an honest account of what each one does and does not catch."
---

# Validating your spec

Use this procedure while writing the API contract in a Building Block (BB)
specification repository. It validates the repository's declared API artifacts;
it does not deploy the API or test a running implementation.

## Prerequisites

The commands assume a checkout of the BB specification repository. Check out
the [guide repository](https://github.com/jeremi/govstack-api-design-guide) as
its `api-design-guide/` subdirectory, using a revision that matches the exact
guide and ruleset versions declared by your specification. This draft uses
`0.3.0-draft` for both. Run every command on this page from the BB repository
root unless stated otherwise.

The driver requires Node.js 20 or newer and npm. It also requires the base
validator for each declared surface: Python, uv, and
`openapi-spec-validator` for OpenAPI; the `asyncapi` executable from
`@asyncapi/cli` for AsyncAPI. Ensure that the uv tool and npm global executable
directories are on `PATH`. Installing the linter dependencies does not install
these validators.

## The GovStack Spectral ruleset <a href="#the-govstack-spectral-ruleset" id="the-govstack-spectral-ruleset"></a>

Use the full driver for normal specification work. Install only the pinned base
validator or validators for the surfaces the BB declares, install the linter,
then run the driver:

```bash
uv tool install openapi-spec-validator==0.9.0  # OpenAPI surfaces, one-time setup
npm install --global @asyncapi/cli@6.0.2       # AsyncAPI surfaces, one-time setup
npm --prefix api-design-guide/linter ci
node api-design-guide/linter/cli.mjs --repo-root .
```

The driver discovers the canonical files from the default paths or
`api/index.yaml`. It checks the repository layout and `api/coverage.yaml`, runs
the applicable base validators, lints canonical and example contracts, and
checks the guide declaration and exceptions described in
[§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version).
The same checks are available to CI through `linter/action.yml`.

### Read the result

Fix errors and review every warning and informational finding. With the default
`--fail-on error`, `PASS` means that no error-level finding remains; it can
still include findings at lower severities. Exit code `1` means that a finding
met the configured threshold. Exit code `2` means that validation could not
complete, for example because a required validator was unavailable.

## OpenAPI

To isolate OpenAPI structural validation after the setup above, run:

```bash
openapi-spec-validator api/openapi.yaml
```

This checks that the entrypoint is structurally valid for its declared qualified OpenAPI 3.1 patch and that its references resolve. It is the mechanical check behind [2.4](../part-a/2-openapi-document-standards.md#24-passes-openapi-spec-validator) and [20.1](../part-e/20-conformance-and-validation.md#201-every-file-passes-validation).

## AsyncAPI

To isolate AsyncAPI structural validation after the setup above, run:

```bash
asyncapi validate api/asyncapi.yaml
```

This checks that the file is a structurally valid AsyncAPI 3 document. It is the mechanical check behind [3.4](../part-a/3-asyncapi-document-standards.md#34-passes-an-asyncapi-validator).

## Run Spectral directly

To isolate the guide's Spectral checks after the setup above, run:

```bash
npx --prefix api-design-guide/linter spectral lint -r api-design-guide/linter/ruleset.yaml api/openapi.yaml
```

Direct Spectral execution omits the driver's repository, coverage, base
validator, exact-version, and exception-suppression checks. Use it to diagnose
a ruleset finding, not as a substitute for the full driver. The
[`linter` reference](../linter/README.md) documents profiles, exceptions, and
other options.

Running `npx @stoplight/spectral-cli lint api/openapi.yaml` *without* `-r` applies only Spectral's generic built-in rules: useful as a quick structural check, but it knows nothing about this guide.

## What "passing" actually means

Each numbered rule has a **Verification** note explained in
[§1.9](../1-introduction.md#19-rule-enforcement-classes). After the driver
passes, review those notes for every applicable rule and perform the stated
manual specification checks. Runtime verification belongs to implementation
conformance, outside this contract-authoring procedure. A clean driver run does
not establish deployed behaviour or complete conformance by itself.

## The book's own machine layer

For checks on this guide's links and generated rule indexes, see
[Maintaining this guide](maintaining-this-guide.md).
