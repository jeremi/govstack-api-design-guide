---
description: "Companion documents and artifacts that pick up the topics this guide places out of scope."
---

# Appendix A. Companion documents and artifacts

[§1.2](../1-introduction.md#12-scope) lists what is out of scope. This appendix names the companion documents and artifacts that pick up those topics.

| Companion | Status | What it covers |
|---|---|---|
| **GovStack API Lifecycle & Governance** | Proposed local v0.1 outline, not a ratified GovStack artifact | Ratification, enforcement, exception lifecycle, transition timelines, conformance levels, companion-artifact ownership, BB editor support, self-amendment of this guide. Reuses the existing GovStack Specification Framework where applicable and defines only the missing API-specific lifecycle, exception, publication, and conformance processes. |
| **GovStack API Security & Operations** | Not yet drafted | Deployment details below the interface baseline in [§13](../part-d/13-authentication-and-authorisation.md): token and claim validation, certificate trust, TLS configuration, key rotation, replay enforcement, audit logging, log hygiene, algorithm allowlists, and FAPI conformance. It must not weaken the RFC 9700 and protected-transport requirements in this guide. |
| [`api/common/govstack-openapi-common.yaml`](../../api/common/govstack-openapi-common.yaml) | Draft artifact vendored from the [`govstack-api-common`](https://github.com/jeremi/govstack-api-common) incubation repository; formal ratification pending | Shared security schemes, RFC 9457 error schema, pagination envelope, W3C Trace Context headers, Operation resource, common error catalogue ([§11.7](../part-c/11-errors.md#117-common-error-catalogue)), and the event-signature profile. |
| [`api/common/govstack-asyncapi-common.yaml`](../../api/common/govstack-asyncapi-common.yaml) | Draft artifact vendored from the [`govstack-api-common`](https://github.com/jeremi/govstack-api-common) incubation repository; formal ratification pending | Shared CloudEvents envelope ([§16.2](../part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required)), `GovStackAsyncError` ([§11.8](../part-c/11-errors.md#118-transport-neutral-asynchronous-errors)), common message headers ([§17](../part-d/17-asyncapi-channel-rules.md)), security schemes, the event-signature profile, and delivery-semantics extensions. |
| **Spectral ruleset** | Exact draft `0.2.0-draft` ships in-repo at [`linter/`](../linter/README.md); formal ratification pending | Machine-enforceable subset of the exact guide version declared under [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version), including canonical discovery, `api/index.yaml`, and `api/coverage.yaml`. [`linter/coverage.yaml`](../linter/coverage.yaml) records per-rule coverage. |
| **Conformance test pack** | Future companion artifact | Governance-defined contract tests beyond schema and Spectral validation. |
| **Reference BB implementation** | Draft example ships in this template; formal ratification pending | Worked example applying the guide end-to-end through [`api/openapi.yaml`](../../api/openapi.yaml), [`api/index.yaml`](../../api/index.yaml), [`api/coverage.yaml`](../../api/coverage.yaml), and the [generic BB specification](../../spec/README.md). |
