# Shared custom-function library

Generic, parameterised Spectral functions that the GovStack section rulesets
(`rulesets/sNN.yaml`) call via `functionOptions`. Section agents should code
against **this document** and not read the sources. Read it end to end before
writing rules: most guide checks are a matter of picking the right function and
options, not writing new JavaScript.

If a shared function almost fits but not quite, do **not** edit it. Either add a
section-local function `functions/sNN-<purpose>.js` (and list it in your
fragment's `functions:` array) or flag the gap in your report.

---

## How functions load (READ THIS — the load-bearing constraint)

The ruleset is composed with `extends`:

```
strict.yaml ─extends→ ruleset.yaml ─extends→ rulesets/sNN.yaml
```

Each **fragment** (`rulesets/sNN.yaml`) that uses a custom function MUST declare,
at the top of the file:

```yaml
functionsDir: "../functions"   # relative to the fragment file
functions:
  - valuePattern               # EVERY custom function the fragment references
  - schemaPropertyNames
```

This has been verified to resolve **both** ways:

- programmatically, via `@stoplight/spectral-ruleset-bundler`'s
  `bundleAndLoadRuleset` (what the test harness uses), and
- via the CLI: `npx spectral lint -r ruleset.yaml <doc>`.

…and through the full two-level `extends` chain above. So `functionsDir` +
`functions:` **inside a fragment** is the supported pattern — you do not need to
touch `ruleset.yaml`.

Rules to obey:

- List **every** function name your fragment references in its `functions:`
  array. A referenced-but-unlisted function is a load error.
- `functionsDir` is always `"../functions"` (fragments live in `rulesets/`).
- The `functions/lib/` directory holds shared internals (`schemaWalk.js`,
  `casing.js`, `util.js`). These are **not** Spectral functions and must never
  appear in a `functions:` array. Spectral only loads what you list; the bundler
  resolves the `lib/` imports automatically. Do not add non-function `.js` files
  to the top level of `functions/`.

## Function contract

Every function is an ESM default export with the Spectral signature:

```js
export default function name(targetVal, options, context) { … }
```

- **`targetVal`** — the value selected by the rule's `given`. What each function
  expects is stated per function below as *Given*.
- **`options`** — your rule's `functionOptions`.
- **`context`** — Spectral context; functions read `context.path` and prefix it
  onto every finding's `path`, so findings point at the offending node.
- **Return** — `undefined` when clean, or an array of
  `{ message, path }` findings. Functions are defensive: bad/`undefined`/
  non-object input returns `undefined` (never throws). Recursive walkers are
  cycle-safe (resolved `$ref`s can be circular).

Use `message: "[<id>][<class>] {{error}}"` in the rule and let the function
supply the precise text via `{{error}}`.

---

## Function reference

Options marked *(required)* must be present; everything else is optional.

### `valuePattern`
Assert a single **string** matches / does not match a regex.
- **Given:** the string itself (`$.info.version`, `$.servers[*].url`, a channel
  address). Spectral calls the function once per selected string.
- **Options:** `match` (regex the value MUST match), `notMatch` /
  `forbidPattern` (regex it MUST NOT match), `flags` (e.g. `"i"`), `name`
  (label used in the message, default `"value"`). Regex strings are compiled
  with `new RegExp`; in YAML prefer single quotes so backslashes stay literal.
- **Example:**
  ```yaml
  given: $.info.version
  then:
    function: valuePattern
    functionOptions:
      name: info.version
      match: '^\d+\.\d+\.\d+$'
  ```

### `schemaPropertyNames`
Recursively assert every declared **property name** obeys a casing/pattern.
- **Given:** a JSON Schema (a body schema, `$.components.schemas[*]`).
- **Options:** `casing` (`camel|pascal|kebab|snake|screamingSnake|flat`),
  `allowPattern` (regex a name must match), `forbidPattern` (regex a name must
  not match, e.g. `'\s'` for spaces / `'[^\x00-\x7F]'` for non-ASCII), `flags`.
- **Example (9.2 camelCase property names):**
  ```yaml
  given: $.components.schemas[*]
  then: { function: schemaPropertyNames, functionOptions: { casing: camel } }
  ```

### `schemaDescriptions`
Recursively assert schema nodes carry a non-empty `description`.
- **Given:** a JSON Schema.
- **Options:** `mode` — `"properties"` (default: every declared property needs a
  description) or `"all"` (every subschema node except pure combinator wrappers
  and required-only assertions below `not`);
  `includeRoot` (properties mode only: also require a description on the root).
- **Example (4.1):**
  ```yaml
  then: { function: schemaDescriptions, functionOptions: { mode: all } }
  ```

### `responseHeaderRequired`
Assert responses whose status matches a pattern declare given header(s), and
optionally that a companion status exists.
- **Given:** an operation's `responses` object
  (`$.paths[*][get,put,post,delete,patch].responses`).
- **Options:** `status` *(required)* (status matcher: `"201"`, `"2xx"`,
  `"default"`, or a regex), `headers` *(required)* (name or array; matched
  case-insensitively unless `caseInsensitive: false`), `requireStatus` (a
  response matching `status` must exist), `alsoRequireStatus` (a companion
  status matcher that must also be present).
- **Example (7.2 Location on 201):**
  ```yaml
  then:
    function: responseHeaderRequired
    functionOptions: { status: "201", headers: [Location] }
  ```

### `operationResponses`
Assert an operation's response set satisfies presence/absence/count rules.
- **Given:** an operation (`$.paths[*][get,put,post,delete,patch]`). Reads
  `.responses`.
- **Options:** `require` (each matcher must match ≥1 status), `requireOneOf`
  (≥1 of the matchers), `forbid` (no status may match), `minCount` (≥N response
  entries), `minNonSuccess` (≥N non-2xx responses). Matchers are status strings
  as above.
- **Example (7.13 must declare 500; 6.6 search must be 200 not 201):**
  ```yaml
  functionOptions: { require: ["500"] }
  functionOptions: { require: ["200"], forbid: ["201"] }
  ```

### `pathSegments`
Structural checks over the `paths` object. One `check` per rule instance.
- **Given:** `$.paths`.
- **Options:** `check` *(required)* one of `versionPrefix` (keys start with
  `/v{N}/`, 5.1), `segmentCasing` (non-version, non-`{param}` segments obey
  `casing`, default kebab, 5.3), `maxDepthAfterVersion` (≤ `max` segments after
  the version, default 2, 5.4); plus `casing` / `max` for those checks.
- **Example (5.4):**
  ```yaml
  given: $.paths
  then:
    function: pathSegments
    functionOptions: { check: maxDepthAfterVersion, max: 2 }
  ```

### `envelopeShape`
Assert a JSON Schema **declares** a required shape (required props, nested
object/array shapes, const/enum/type on leaves). Inspects the schema, does not
validate a data instance. One level of top-level `allOf` is merged.
- **Given:** the schema (a response schema, `$.components.schemas.Foo`).
- **Options (a recursive spec node):** `requiredProperties` (names that must be
  in `required`), `forbiddenProperties` (names that must not be declared),
  `properties` (`name -> child spec`; each named property must
  be declared and is validated by its child), `type`, `const`, `enum` (schema's
  `enum` must equal this as a set), `items` (child spec for array `items`).
- **Example (12.3 page envelope):**
  ```yaml
  functionOptions:
    requiredProperties: [items, pageInfo]
    properties:
      items: { type: array }
      pageInfo: { requiredProperties: [nextCursor] }
  ```
- **Example (16.2 CloudEvents payload):**
  ```yaml
  functionOptions:
    requiredProperties: [specversion, id, source, type]
    properties: { specversion: { const: "1.0" } }
  ```

### `securityCoverage`
Check operations are authenticated (or explicitly opted out).
- **Given / modes:**
  - default `"covered"` — **Given:** `$`. Every operation must be covered by a
    non-empty root `security` or an operation-level `security` (`security: []`
    counts as an allowed explicit opt-out). Option `requireSchemes: true` also
    requires `components.securitySchemes` to be non-empty. (13.1)
  - `mode: "none"` — **Given:** a single operation. It MUST declare
    `security: []` (unauthenticated), e.g. the /health GET. (5.9/13.x)
- **Example:**
  ```yaml
  given: $
  then: { function: securityCoverage, functionOptions: { requireSchemes: true } }
  ```

### `schemaFieldFormat`
For every property whose **name** matches a pattern, require its schema to
declare type/format/pattern/contentEncoding constraints. Drives the §10 proxies.
- **Given:** a JSON Schema.
- **Options:** `namePattern` *(required)* (regex on the property name),
  `nameFlags`, and `require`: `type`, `forbidType` (string or array), `format`,
  `formatOneOf`, `contentEncoding`, `pattern` (exact match), `mustDeclare`
  (array of keywords that must simply be present, e.g. `["maxLength"]`).
- **Example (10.2 timestamps; 10.4 money not a number):**
  ```yaml
  functionOptions: { namePattern: 'At$', require: { type: string, format: date-time } }
  functionOptions: { namePattern: '(amount|price|balance)$', nameFlags: i, require: { forbidType: number } }
  ```

### `extensionShape`
Validate presence and shape of an `x-govstack-*` extension on a container.
- **Given:** the container that carries the extension (an operation, `$.info`,
  a message).
- **Options:** `extension` *(required)* (the key), `required` (default true),
  `valueType` (`string|object|array`), `enum` (allowed string values),
  `requiredKeys` (object keys that must be present), `semverKeys` (object keys
  whose value must be SemVer), `keyEnums` (`{ key: [values] }`), `keyPatterns`
  (`{ key: regexString }`).
- **Example (20.3 guide metadata):**
  ```yaml
  functionOptions: { extension: x-govstack-api-guide, valueType: object, requiredKeys: [version], semverKeys: [version] }
  ```

### `mediaTypeExpected`
Assert a `content` map declares / forbids media types.
- **Given:** a `content` object (`…requestBody.content`, a response's
  `.content`). Patterns are regexes matched against the media-type keys, so
  escape `+`: `application/problem\+json`.
- **Options:** `require` (each pattern must match ≥1 key), `requireOneOf`,
  `forbid`.
- **Example (11.1 problem+json on errors; 6.4 PATCH merge-patch):**
  ```yaml
  functionOptions: { require: ['application/problem\+json'] }
  functionOptions: { require: ['application/merge-patch\+json'], forbid: ['^application/json$'] }
  ```
  (6.4 uses `require` + `forbid`, not `requireOneOf`: merge-patch is the MUST
  baseline and json-patch only a MAY addition, so a json-patch-only body must
  still fail.)

---

## Internals (`functions/lib/`, not Spectral functions)

- **`schemaWalk.js`** — `walkSchema(root, visit, opts)` visits every subschema
  (Draft 2020-12 keywords: properties/patternProperties/additional·unevaluated,
  items/prefixItems, allOf/anyOf/oneOf/not/if/then/else, $defs, contains,
  propertyNames, dependentSchemas). Cycle-safe (WeakSet on node identity — each
  distinct schema object is visited once). `forEachProperty(root, cb)` yields
  every declared property with its path.
- **`casing.js`** — `matchesCasing(name, type)` and `CASING_TYPES`.
- **`util.js`** — `isObject`, `isNonEmptyString`, `asArray`, `toRegExp`
  (returns `undefined` on invalid patterns), `statusMatcher` (expands
  `2xx`/`default`/exact/regex), `SEMVER_PATTERN`.

If you need to walk schemas in a section-local function, import
`./lib/schemaWalk.js` — do not re-implement cycle protection.
