# Prompt - MCP Interface Ergonomics

Use this prompt to design, audit, reshape, or verify an MCP server interface for reliable and efficient agent use.

This procedure adapts ergonomic ideas from Agent eXperience Interface (AXI), copyright Kun Chen, MIT License: <https://github.com/kunchenguid/axi>. AXI primarily specifies agent-facing CLIs; this prompt translates applicable principles to version-specific MCP contracts rather than treating MCP as a CLI transported through JSON.

```text
I want to improve an MCP interface.

Select one mode:
- design: define a new interface before implementation;
- audit: inspect an existing interface without modifying it;
- reshape: propose public-contract changes, obtain approval, then implement;
- verify: test an implemented interface against its declared contract and representative agent intents.

If the request does not identify a mode, use read-only audit. Do not silently enter reshape mode.

Before analysis:
1. read repository instructions and `pom.config.json` when present;
2. identify the MCP specification revision, transport, applicable authorization specification, server SDK version, and expected client/host versions actually used by the Target Project;
3. read the server entrypoint, capability declaration, tool/resource/prompt registrations, schemas, handlers, shared domain services, transport and operation authorization boundaries, and relevant tests;
4. inspect representative consumers, transcripts, fixtures, or documented agent intents when available;
5. check Git status before reshape work;
6. declare missing sources, unsupported client capabilities, and absent evidence instead of inventing behavior.

Do not apply requirements from a newer MCP revision without checking compatibility. Where this prompt and the Target Project's MCP revision differ, the versioned MCP specification is authoritative and the divergence must be reported.

Build separate interface inventories.

Tool inventory:
- name, title, description, and declared intent;
- `inputSchema`, `outputSchema`, required fields, defaults, bounds, and unknown-property policy;
- result content types, `structuredContent`, truncation, pagination, and partial-result behavior;
- `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`, including omitted-value defaults for the active MCP revision;
- side effects, authorization, sensitive-data boundary, retry/concurrency behavior, and actual idempotency;
- protocol errors versus tool execution errors;
- related or overlapping tools;
- source and test locations.

Resource inventory:
- URI or URI template, name, title, description, and MIME type;
- list/read behavior, pagination, annotations, text/blob content, size limits, and error behavior;
- capability declaration, subscriptions, `listChanged`, and update semantics when supported;
- URI stability, parameter validation, authorization parity between listing and reading, and sensitive-data boundary;
- source and test locations.

Prompt inventory:
- name, title, description, and user-controlled invocation model;
- declared arguments, required/optional semantics, defaults, and validation;
- returned messages, roles, content types, embedded resources, and completion behavior when supported;
- treatment of user-supplied and retrieved content as untrusted data;
- list/get change behavior, authorization, and version-specific error mapping;
- source and test locations.

Evaluate the following MCP-adapted principles.

1. Protocol-native, version-aware output
- Prefer protocol-native structured content and MCP resource mechanisms when the active revision and expected clients support them.
- Keep internal domain models separate from the public response projection.
- If a tool declares `outputSchema`, its successful `structuredContent` MUST conform to that schema; verify conformance rather than trusting the handler type.
- Follow the active MCP revision's compatibility rule for mirrored text. In MCP 2025-06-18, a tool returning `structuredContent` SHOULD also return serialized JSON in a `TextContent` block for backwards compatibility; do not remove that mirror merely to reduce tokens.
- Use unstructured text for genuinely textual payloads and for required compatibility paths.
- Do not claim token savings without measuring representative results through the actual host path.

2. Minimal decision-complete schemas
- Default list responses to the smallest fields that let the agent identify an item and choose the next action, commonly an identifier, label/title, state, and at most one decision-relevant summary.
- Separate list and detail intents, or provide explicit field selection when the framework can validate it.
- Set limits from observed domain distributions, not arbitrary small defaults that force pagination.
- Treat every tool definition, schema field, enum, prompt argument, and resource description as context cost.
- Do not remove fields that are needed to preserve task success, authorization clarity, or correct next-action selection.

3. Explicit long-content policy
- Do not omit large fields silently. Return a useful preview plus total size and `truncated: true` when the response contract supports those fields.
- Provide a clear escape hatch through detail retrieval, sections, cursor/offset retrieval, or an authorized MCP resource URI, whichever best fits the server.
- Bound all retrieval paths, including nominally full paths, when backend or host limits require it; disclose those bounds.
- Preserve authorization and redaction across preview and full-content paths.
- Suggest the escape hatch only when truncation occurred.

4. Round-trip-reducing aggregates
- Include total result count when available without disproportionate cost.
- Include cheap derived state that commonly determines the next action, such as passed/total checks or comment count.
- Prefer a compact summary over embedding all related records.
- Do not add speculative fields that are expensive, stale, rarely used, or liable to cross an authorization boundary.

5. Definitive empty and partial states
- Distinguish successful zero results from missing data, filtered-out data, partial data, and retrieval failure.
- Return explicit counts and relevant scope for empty collections.
- Mark partial responses and continuation state explicitly; never let an agent infer completeness from a page-sized array.
- Test invalid, expired, unauthorized, and not-found resource identifiers separately from empty resource content.

6. Protocol-correct errors and safe mutations
- Validate request shape before dependency calls or side effects.
- Use JSON-RPC protocol errors for failures classified as protocol/request errors by the active MCP revision, such as unknown methods/tools, malformed requests, or unsupported operations.
- Separate transport authorization failures from MCP operation failures. For MCP 2025-11-25 HTTP authorization, an invalid or expired access token uses HTTP 401 with the required `WWW-Authenticate` challenge, while insufficient permissions or scopes use HTTP 403 and the revision-specific scope guidance; do not encode a request rejected at the transport authorization boundary as a tool result.
- After transport authorization succeeds, for a valid tool call whose execution or domain operation fails—including an operation-level authorization denial when the active revision classifies it as execution failure—return the version-appropriate tool result with `isError: true`; include an actionable safe message and stable domain detail only when the result contract supports it.
- Follow the active revision's resource and prompt error mappings instead of forcing them into tool `isError` semantics.
- Do not expose raw stack traces, dependency noise, credentials, tokens, internal paths, or unauthorized existence information.
- Make mutations idempotent where repeating the same intent is safe: an already-satisfied state returns a successful no-op rather than forcing a preliminary read.
- Reject unknown properties when the declared JSON Schema and compatibility policy permit it; never silently ignore an input that appears to scope or alter an operation.
- Distinguish authentication failure, authorization denial, not found, conflict, rate limit, dependency failure, and internal failure without leaking protected data.

7. Compact discovery context and truthful annotations
- Treat names, descriptions, argument/schema definitions, resource metadata, and prompt metadata as ambient context that may load before any call.
- Keep descriptions short, outcome-focused, and explicit about consequential side effects.
- Avoid near-duplicate capabilities whose distinctions are hard for an agent to infer.
- Verify every tool annotation against actual behavior and verify omitted annotations against the active revision's conservative defaults.
- Tool annotations are untrusted hints, not authorization or confirmation controls; clients MUST treat them as untrusted unless they come from trusted servers.
- Use resources or prompts as on-demand context when appropriate instead of embedding manuals in every tool description.
- Do not add a session hook merely to imitate a CLI pattern; use host lifecycle integration only for a demonstrated, consented need.

8. Intent-first entry points
- MCP has no direct equivalent of a CLI no-arguments home view.
- Add an overview tool or resource only when live state materially reduces common orientation calls.
- Prefer intent-shaped operations over backend-shaped primitives when repeated composition is deterministic and safe.
- Preserve useful primitives when agents need flexible exploration; do not replace the whole surface with rigid workflows.

9. Contextual, non-prescriptive next actions
- Include a small number of next actions only when they follow from the result and reduce discovery effort.
- When represented structurally, name the capability and provide safe argument templates or placeholders rather than fabricated values.
- Carry forward required scope such as repository, workspace, tenant, or source.
- Omit suggestions when the response is already self-contained.
- Guide discovery; do not force a fixed workflow.

10. Schema-native help
- Treat names, descriptions, annotations, schemas, resource metadata, and prompt arguments as the primary help surface.
- State required inputs, defaults, bounds, side effects, and ambiguous enum semantics concisely.
- Add examples only where they resolve genuine ambiguity.
- Do not create a duplicate help tool unless a verified host limitation requires it.

Cross-cutting checks:
- Tool topology: merge accidental aliases; separate genuinely different intents.
- Security: read the active revision's authorization requirements when authorization is in scope; verify least authority, token audience and scope handling, transport-level 401/403 behavior, operation-level denials, tenant/workspace scoping, rate limits, output sanitization, prompt-injection boundaries, redaction, and authorization parity across list/detail or preview/full paths.
- Responsibility boundary: server enforcement protects data and operations; host/client confirmation is a separate control and must not be replaced by annotations.
- Compatibility: identify renamed/removed capabilities, fields, arguments, enum values, defaults, annotations, mirrored content, and error semantics; classify each proposed change as compatible or breaking.
- Concurrency: identify stale-read and retry behavior for mutations; use conflict/version information when the domain supports it.
- Observability: keep operator diagnostics out of agent results unless safe and actionable.
- Capability negotiation: use only MCP features supported by the actual server SDK and expected clients.

Mode behavior:

DESIGN
1. Start from concrete agent intents and success criteria.
2. Propose the smallest coherent tool/resource/prompt topology.
3. Define type-specific input/argument/URI, success, empty, partial, error, annotation, and no-op contracts.
4. Define `outputSchema` and mirrored-content policy for structured tools, long-content policy for resources, and message/content policy for prompts.
5. Present the public contract, compatibility target, and unresolved decisions before implementation.

AUDIT
1. Remain read-only.
2. Cite every finding with file and line or another concrete source.
3. Classify severity: critical permits unsafe access/effects or protocol-invalid behavior; high can cause wrong agent action or broad incompatibility; medium adds avoidable calls/tokens or ambiguity; low is localized friction.
4. Use not-applicable where a principle does not fit.
5. Separate observed defects from hypotheses that need transcripts or measurement.
6. Prioritize by protocol validity, security, agent failure risk, avoidable round trips, token cost, and implementation effort.

RESHAPE
1. Produce the audit and desired contract first.
2. Identify every public-contract and migration impact.
3. Ask for explicit approval before any public-contract change, including compatible changes to names, descriptions, schemas, arguments, defaults, annotations, content mirroring, errors, side effects, or topology; label breaking changes separately.
4. Implement through the Target Project's existing MCP SDK and domain layer; do not add a POM runtime.
5. Preserve compatibility shims only when explicitly approved and time-bounded; do not silently accumulate parallel historical interfaces.
6. Update tests and authoritative interface documentation.

VERIFY
1. Run the Goal-Backward Check first: state what must be true for the intended interface outcome to be achieved, and do not pass verification if the outcome is false even when individual checks pass.
2. Verify at least two positive representative agent intents based on real user use cases, including at least one end-to-end intent for every changed capability; success means the intended decision or operation remains correct, not merely that a response is smaller.
3. Verify empty and partial behavior where applicable.
4. Verify at least one error or misuse scenario, malformed request handling, one valid-call execution/domain failure, and one dependency or authorization failure. Distinguish HTTP 401/403 transport authorization, JSON-RPC protocol errors, and tool execution results with `isError: true` according to the active revisions.
5. If `outputSchema` is declared, validate successful `structuredContent` against it and prove an intentionally invalid fixture is rejected.
6. Verify active-revision mirrored-content requirements and expected-client compatibility.
7. Verify annotation values/defaults against actual behavior and repeat each safe mutation to verify declared idempotency.
8. Verify resource URI/template validation, MIME/content behavior, authorization parity, pagination, and subscription/list-change behavior when declared.
9. Verify prompt argument validation, returned roles/content types, embedded-resource behavior, and untrusted-content handling.
10. Verify truncation metadata and every advertised escape hatch.
11. Verify that stack traces, secrets, dependency noise, internal paths, and protected existence information do not leak.
12. Compare before and after for representative intents: task success, number of tool calls, and serialized response size. When claiming token efficiency or token savings, also measure host-visible token usage through the actual expected host path; byte or character count alone is insufficient. A smaller response is not an improvement if it creates extra calls or loses decision-critical data.
13. Missing evidence never counts as verified.

Audit finding format:
| Capability | Type | Severity | Evidence | Agent impact | Proposed contract | Compatibility | Verification |

Final output:
- selected mode and active MCP/SDK/client compatibility target;
- separate tool, resource, and prompt inventories plus missing evidence;
- findings ordered by severity and leverage;
- desired contracts or implemented changes;
- protocol, security, and compatibility impact;
- scenario results and measured task-success/tool-call/response-size evidence, plus host-visible token evidence for token-efficiency claims;
- unresolved decisions and next safe action.

Memory rules:
- update enabled POM modules only when the result changes durable project understanding;
- use a Decision Record only for consequential choices and only when `adoption.decisions` is enabled;
- do not archive transient audit output by default;
- do not claim the interface is efficient, safe, compatible, or verified without concrete evidence from this run.
```
