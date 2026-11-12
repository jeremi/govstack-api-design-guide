---
description: "Choose the right contract files, design one interaction, and prepare a Building Block API specification for review."
---

# How to use this guide

Use this guide while writing the API contract for a Building Block (BB) specification. Start with the kind of interface you are defining, work through one interaction, and check the resulting files before review.

## Find your path <a href="#find-your-path" id="find-your-path"></a>

| What are you specifying? | Start with |
| --- | --- |
| An HTTP API that reads or searches data | [OpenAPI document standards](part-a/2-openapi-document-standards.md), then the read-only list in [Rules by API kind](rules-by-kind.md). |
| An HTTP API that also creates, changes, or deletes data | The HTTP read and mutation rules in [Rules by API kind](rules-by-kind.md). Check [safe retries](part-d/14-idempotency.md) and [asynchronous operations](part-d/15-asynchronous-operations.md) when those behaviours apply. |
| Events delivered to HTTP subscriber URLs | [CloudEvents and webhooks](part-d/16-cloudevents-and-webhooks.md). Document HTTP push webhooks in OpenAPI. |
| Brokered events or event streams | [AsyncAPI document standards](part-a/3-asyncapi-document-standards.md), [CloudEvents](part-d/16-cloudevents-and-webhooks.md), and [channel rules](part-d/17-asyncapi-channel-rules.md). |
| An interface governed by another standard | [Scope and standards-defined surfaces](1-introduction.md#12-scope) and the [surface inventory](part-a/4-documentation-requirements.md#45-api-surface-inventory). The draft's `standard` inventory entries support advisory review only. |

A specification can contain several kinds of interface. Apply each rule where its conditions hold. For an already-published API, read the [transition rules](1-introduction.md#110-applicability-and-transition) before changing a client-visible contract.

## What a BB publishes <a href="#what-a-bb-publishes" id="what-a-bb-publishes"></a>

Keep the API contract and its supporting files in the **BB specification repository**. One canonical file is the authoritative entrypoint for each surface.

| File | Purpose |
| --- | --- |
| `api/openapi.yaml` | Default entrypoint for an HTTP API, including any HTTP push webhooks. See [§2.2](part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint). |
| `api/asyncapi.yaml` | Default entrypoint for brokered events or event streams. See [§3.2](part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint). |
| `api/index.yaml` | Lists the canonical files when the default paths are insufficient, for example when there are several HTTP APIs. See [§4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory) for the inventory format and the declaration for a specification with no service interface. |
| `api/coverage.yaml` | Links active functional requirements to operations, messages, external contracts, or a documented non-API verification boundary. A tracked plan records a gap and prevents full conformance. See [§4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability). |

Use the contract files that match your interfaces. Each canonical OpenAPI or AsyncAPI file also declares the exact guide and ruleset versions in `info.x-govstack-api-guide` ([§20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version)).

## Work through one interaction

**Example (informative): retrieving a registration application by its identifier.** The existing examples in [§4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability) and [§4.7](part-a/4-documentation-requirements.md#47-operation-metadata-extensions) use `retrieveApplication` to connect a requirement to an API operation.

1. **Describe the operation.** In the canonical OpenAPI file, define the path, identifier parameter, and `retrieveApplication` operation. Explain what the caller receives and the access it needs.
2. **Make the responses clear.** Specify the successful response and applicable errors, including the missing-application case. Add useful schema descriptions and representative examples ([§4](part-a/4-documentation-requirements.md), [§7](part-b/7-http-status-codes.md), [§11](part-c/11-errors.md)).
3. **Connect it to the requirement.** In `api/coverage.yaml`, map the requirement ID to `retrieveApplication`. Use `requirements` for active requirements or the optional `draftRequirements` list for draft mappings, following [§4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability).
4. **Validate and review.** Run the checks in [Validating your spec](guides/validating-your-spec.md), then use the [spec editor checklist](guides/spec-editor-checklist.md). A reviewer checks that the operation actually fulfils the requirement and gives a client enough information to handle success and failure.

Repeat this process for the other interactions. The example shows the authoring sequence, not a complete API contract or a conformance result.

## About the rule titles <a href="#about-the-rule-titles" id="about-the-rule-titles"></a>

The short titles on rule headings (for example "9.2 camelCase field names") are navigation aids. They are **non-normative**: only the rule body defines the requirement. If a title and its body ever seem to disagree, the body wins, and please report it.

Use [Rules at a glance](all-rules.md) to look up a rule. **MUST** is mandatory for conformance, **SHOULD** is the default recommendation with written justification needed to depart from it, and **MAY** is optional ([§1.5](1-introduction.md#15-language)). Each rule's Verification details explain which checks are automated and what still needs review.

## Other ways to use the guide

- **Reading a specification to implement it:** [§1.8](1-introduction.md#18-layering-what-this-guide-constrains) distinguishes the API contract, implementation profile, and deployment.
- **Assessing Building Blocks for adoption:** start with the [Introduction](1-introduction.md) and [Compatibility and lifecycle](part-d/18-compatibility-and-lifecycle.md).
- **Using an AI assistant:** [Using this guide with AI agents](guides/using-with-ai-agents.md) explains the machine-readable `rules.yaml` index and gives an instruction block for a BB repository.

## How to review this draft <a href="#how-to-review-this-draft" id="how-to-review-this-draft"></a>

This guide is not yet ratified. Committee feedback is most useful when it identifies a concrete rule or an authoring task that needs to change:

1. **Scope:** is a shared rule needed across BB specifications? See [§1.2](1-introduction.md#12-scope).
2. **Usability:** can an editor find and apply the guidance to a real specification?
3. **Prescriptiveness:** is the requirement level justified, and can the rule be checked? See [§1.5](1-introduction.md#15-language) and [§20](part-e/20-conformance-and-validation.md).
4. **CFR compatibility:** are the proposed relationships and pending changes in [§1.3](1-introduction.md#13-relationship-to-existing-govstack-documents) correct?

Submit issues or pull-request feedback with the rule, the difficulty, and an example from specification work.
