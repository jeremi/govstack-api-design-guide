---
description: "Rules for how BB API specs declare security schemes, OAuth scopes, and the credential channel for authentication and authorisation."
---

# 13. Authentication and authorisation

{% hint style="info" %}
**Intent.** Every BB declares its security model in the same way, so integrators see a uniform shape for "how do I call this BB" across the catalogue.

**Applies to:** Universal. Rules reference OpenAPI `securitySchemes`; AsyncAPI 3.0 uses corresponding declarations under `components.securitySchemes` and operation/server `security` (for example, `oauth2`, `openIdConnect`, and `X509`).
{% endhint %}

## 13.1 Default security on every operation <a href="#131-default-security-on-every-operation" id="131-default-security-on-every-operation"></a>

**[M]** Each BB API spec **MUST** declare a security scheme block and apply it by default to every operation. On the OpenAPI surface this is a root-level `security` requirement referencing schemes under `components.securitySchemes`. AsyncAPI 3.0 has no root-level `security`: schemes are declared under `components.securitySchemes` and applied on the `servers` and `operations` objects, which together **MUST** cover every operation. Per-operation overrides **MUST** be explicit.

## 13.2 OAuth and OIDC for citizen operations <a href="#132-oauth-and-oidc-for-citizen-operations" id="132-oauth-and-oidc-for-citizen-operations"></a>

**[M+R]** Citizen-facing operations **MUST** declare an OAuth 2.0 + OIDC security requirement. On the OpenAPI surface this is either a `type: openIdConnect` scheme carrying `openIdConnectUrl` (the OIDC discovery document) or a `type: oauth2` scheme declaring the relevant `flows`. (A `type: oauth2` scheme does not carry a discovery URL; the discovery URL belongs to the `openIdConnect` scheme type.) Reference specifications that are not tied to a live identity provider **MAY** use documented deployment variables or reserved documentation domains for discovery, authorisation, token, and JWKS URLs. Adopter-specific identity-provider endpoints belong in implementation profiles.

## 13.3 Distinct scheme for BB-to-BB calls <a href="#133-distinct-scheme-for-bb-to-bb-calls" id="133-distinct-scheme-for-bb-to-bb-calls"></a>

**[M+R]** BB-to-BB operations crossing a service-to-service trust boundary, whether routed directly or through an interoperability mediator, **MUST** declare a distinct security scheme appropriate for service-to-service auth. On OpenAPI this is typically `type: mutualTLS` or OAuth client credentials; on AsyncAPI this is typically `type: X509`, OAuth client credentials, or a protocol-specific scheme such as SASL where the broker requires it. The spec **MUST** make clear which operations are citizen-facing vs inter-BB.

## 13.4 Namespaced OAuth scopes <a href="#134-namespaced-oauth-scopes" id="134-namespaced-oauth-scopes"></a>

**[M]** OAuth scope strings **MUST** be documented per operation, and **MUST** follow a single ecosystem-wide naming convention so that one BB's scope does not collide with another's. The default shape is `bb:{bb-code}:{resource}:{action}`. The `{bb-code}` segment is the BB's single registered code per [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The `bb:` prefix is retained for OAuth scopes because colon-separated scope strings are widely supported and readable in OAuth tooling; reverse-DNS (`org.govstack.{bb-code}.{resource}.{action}`) and `resource.action` are alternatives. [`[OPEN-12-A]`](../appendix/b-open-questions.md)

## 13.5 Authorization is the credential channel <a href="#135-authorization-is-the-credential-channel" id="135-authorization-is-the-credential-channel"></a>

**[M+R]** Credentials **MUST NOT** be declared in URL paths, query parameters, cookies, or fragments. The `Authorization` header is the only declared credential channel for token-based schemes.

## 13.6 API keys only for operational endpoints <a href="#136-api-keys-only-for-operational-endpoints" id="136-api-keys-only-for-operational-endpoints"></a>

**[R]** API keys **MAY** be declared on operational endpoints (`/health` and similar per [§5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint)). They **MUST NOT** be declared on operations that read or write personal data.

## Note on consent propagation <a href="#note-on-consent-propagation" id="note-on-consent-propagation"></a>

Cross-service propagation of end-user consent or authorisation context (for example, when one BB calls another on behalf of a data subject) is not specified by this guide. The expected mechanism is OAuth-native (scopes, claims, or RFC 9396 Rich Authorization Requests inside the access token), and the concrete shape belongs in the relevant consent, authorisation, and inter-BB trust specifications, not here.
