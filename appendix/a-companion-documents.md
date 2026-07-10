---
description: "Companion documents and artifacts that pick up the topics this guide places out of scope."
---

# Appendix A. Companion documents and artifacts

[§1.2](../1-introduction.md#12-scope) lists what is out of scope. This appendix names the companion documents and artifacts that pick up those topics.

| Companion | Status | What it covers |
|---|---|---|
| **GovStack API Lifecycle & Governance** | Proposed local v0.1 outline, not a ratified GovStack artifact | Ratification, enforcement, exception lifecycle, transition timelines, conformance levels, companion-artifact ownership, BB editor support, self-amendment of this guide. Reuses the existing GovStack Specification Framework where applicable and defines only the missing API-specific lifecycle, exception, publication, and conformance processes. |
| **GovStack API Security & Operations** | Not yet drafted | Operational behaviour of a deployed BB: token validation, certificate trust, key rotation, replay enforcement, audit logging, log hygiene, alg allowlists, FAPI conformance. |
| `govstack-openapi-common.yaml` | To be authored alongside v1.0 | Shared security scheme, RFC 9457 error schema, pagination envelope, common headers, Operation resource, common error catalogue ([§11.7](../part-c/11-errors.md#117-common-error-catalogue)). |
| `govstack-asyncapi-common.yaml` | To be authored alongside v1.0 | Shared CloudEvents envelope ([§16.2](../part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required)), common message headers ([§17](../part-d/17-asyncapi-channel-rules.md)), common security schemes (OAuth 2.0, OpenID Connect, X.509/mTLS), signing metadata, delivery-semantics extensions, and common error messages referencing the [§11](../part-c/11-errors.md) error envelope. |
| **Spectral ruleset** | Draft ships in-repo at [`linter/`](../linter/README.md); formal v1.0 companion publication pending | Machine-enforceable subset of the guide's rules ([§20](../part-e/20-conformance-and-validation.md)). The draft covers OpenAPI, CloudEvents, and AsyncAPI documentation rules ([`linter/coverage.yaml`](../linter/coverage.yaml) records per-rule coverage); protocol-profile rules may be added later. |
| **Conformance test pack** | Future companion artifact | Governance-defined contract tests beyond schema and Spectral validation. |
| **Reference BB implementation** | Future companion artifact | Worked example applying the guide end-to-end to one BB. |
