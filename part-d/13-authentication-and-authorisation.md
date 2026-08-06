---
description: "Rules for how BB API specs declare security schemes, OAuth scopes, and the credential channel for authentication and authorisation."
---

# 13. Authentication and authorisation

{% hint style="info" %}
**Intent.** Every BB declares its security model in the same way, so integrators see a uniform shape for "how do I call this BB" across the catalogue.

**Applies to:** Universal. Rules reference OpenAPI `securitySchemes`; AsyncAPI 3.0 uses corresponding declarations under `components.securitySchemes` and operation/server `security` (for example, `oauth2`, `openIdConnect`, and `X509`).
{% endhint %}

## 13.1 Default security on every operation <a href="#131-default-security-on-every-operation" id="131-default-security-on-every-operation"></a>

**[M]** Each BB API spec **MUST** declare a security scheme block and apply it by default to every operation. On the OpenAPI surface this is a root-level `security` requirement referencing schemes under `components.securitySchemes`. AsyncAPI 3.0 has no root-level `security`: schemes are declared under `components.securitySchemes` and applied on the `servers` and `operations` objects, which together **MUST** cover every operation. Per-operation overrides **MUST** be explicit. The standard unversioned endpoints of [§5.10](../part-b/5-url-structure-and-versioning.md#510-standard-unversioned-endpoints) satisfy this rule with an explicit empty security requirement (`security: []`) where they are unauthenticated: they are exempt from carrying a scheme, not from declaring what they carry.

## 13.2 OAuth and OIDC for citizen operations <a href="#132-oauth-and-oidc-for-citizen-operations" id="132-oauth-and-oidc-for-citizen-operations"></a>

**[M+R]** Citizen-facing protected operations **MUST** declare OAuth 2.0 authorization backed by an OpenID Connect provider. On OpenAPI this is either `type: openIdConnect` with `openIdConnectUrl`, or `type: oauth2` with an `authorizationCode` flow. An API that is purely a resource server, validating access tokens issued by an authorization server it does not own and whose endpoints are not part of its own contract, **MAY** instead declare `type: http` with `scheme: bearer` and `bearerFormat: JWT`, because declaring an `oauth2` flow it does not operate would misdescribe the deployed API. That declaration **MUST** document, in the scheme description or an adjacent `/.well-known/` metadata document, the issuers it accepts and the audience value it requires, so an integrator can still discover how to obtain a usable token. The security-scheme description **MUST** state that the API accepts access tokens and **MUST NOT** treat an OIDC ID Token as an API access token. Authorization-code clients **MUST** use PKCE with `S256` as required by the RFC 9700 security baseline; the resource-owner password grant **MUST NOT** be declared, and the implicit grant **MUST NOT** be declared for a new surface. Reference specifications not tied to a live provider **MAY** use a reserved documentation-domain discovery URL; adopter-specific discovery, authorisation, token, and JWKS endpoints belong in implementation profiles.

## 13.3 Distinct scheme for BB-to-BB calls <a href="#133-distinct-scheme-for-bb-to-bb-calls" id="133-distinct-scheme-for-bb-to-bb-calls"></a>

**[M+R]** BB-to-BB operations crossing a service-to-service trust boundary, whether routed directly or through an interoperability mediator, **MUST** declare a distinct security scheme appropriate for service-to-service authentication. On OpenAPI this **MUST** be `type: mutualTLS` or an OAuth client-credentials scheme using confidential-client authentication; on AsyncAPI it **MUST** be `type: X509`, OAuth client credentials, or a documented protocol-specific scheme such as SASL. OAuth access tokens **MUST** be audience-restricted to the intended BB and scope-restricted to the operation. Sender-constrained access tokens under RFC 8705 or RFC 9449 **SHOULD** be used across an inter-BB trust boundary. The spec **MUST** distinguish citizen-facing from inter-BB operations.

## 13.4 Namespaced OAuth scopes <a href="#134-namespaced-oauth-scopes" id="134-namespaced-oauth-scopes"></a>

**[M]** Where an operation's authorization is scope-based, its OAuth scope strings **MUST** be documented per operation and namespaced so one BB's scopes cannot collide with another's. An API that authorizes on verified token claims rather than scopes **MUST** document, per operation, which claims it requires and what values it accepts; it **MUST NOT** declare scope strings it does not enforce. New GovStack scopes **SHOULD** use `bb:{bb-code}:{resource}:{action}`. The `{bb-code}` segment is the BB's single registered code per [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code).

## 13.5 Authorization is the credential channel <a href="#135-authorization-is-the-credential-channel" id="135-authorization-is-the-credential-channel"></a>

**[M+R]** Credentials **MUST NOT** be declared in URL paths, query parameters, cookies, or fragments. The `Authorization` header is the only declared credential channel for token-based schemes.

## 13.6 API keys only for operational endpoints <a href="#136-api-keys-only-for-operational-endpoints" id="136-api-keys-only-for-operational-endpoints"></a>

**[R]** API keys **MAY** be declared on operational endpoints (`/health` and similar per [§5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint)). They **MUST NOT** be declared on operations that read or write personal data.

## Note on consent propagation <a href="#note-on-consent-propagation" id="note-on-consent-propagation"></a>

Cross-service propagation of end-user consent or authorisation context (for example, when one BB calls another on behalf of a data subject) is not specified by this guide. The expected mechanism is OAuth-native (scopes, claims, or RFC 9396 Rich Authorization Requests inside the access token), and the concrete shape belongs in the relevant consent, authorisation, and inter-BB trust specifications, not here.

## 13.7 Protected transport <a href="#137-protected-transport" id="137-protected-transport"></a>

**[M+R]** Every externally reachable OpenAPI server URL and HTTP webhook callback URL **MUST** use `https`. Every AsyncAPI server **MUST** declare a TLS-protected transport or a protocol security binding that provides equivalent confidentiality, integrity, and server authentication. Cleartext transport **MUST NOT** carry credentials, personal data, or GovStack domain events. Negotiated TLS **MUST** be version 1.3 or higher, inherited from `govstack-cfr-security#req-1` and not relaxable by a BB specification. Remaining TLS deployment configuration **MUST** follow RFC 9325 or its successor; concrete certificate trust and cipher configuration are outside this guide.
