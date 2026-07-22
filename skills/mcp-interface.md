---
name: mcp-interface
description: Use when designing, auditing, reshaping, or verifying MCP tools, resources, prompts, schemas, responses, errors, or agent-facing ergonomics.
---

# Skill - mcp-interface

## When To Use

- Design a new MCP server interface.
- Audit an existing MCP server for agent usability, token cost, or excessive round trips.
- Reshape MCP tools, resources, prompts, schemas, responses, or errors.
- Verify an MCP interface after a change.

## Canonical Prompt

`prompts/35-mcp-interface.md`

## Key Rules

- Choose one mode: `design`, `audit`, `reshape`, or `verify`; default to read-only `audit` when intent is unclear.
- Treat the Target Project's MCP revision as protocol authority and agent ergonomics as the interface-design layer.
- Apply version-specific structured-content, mirrored-text, `outputSchema`, transport-authorization, error-channel, and annotation rules.
- Distinguish HTTP authorization failures, JSON-RPC protocol errors, and tool execution errors.
- Audit tools, resources, and prompts with separate type-correct inventories and verification contracts.
- Read the actual registrations, schemas, handlers, authorization boundaries, and tests before judging the interface.
- Ask for approval before any public-contract change; identify breaking changes separately.
- Apply the POM verification gate: Goal-Backward Check, at least two positive user scenarios, and at least one error or misuse scenario.
- Measure task success, response size, and tool calls; require host-visible token measurements for token-efficiency claims and do not infer improvement from smaller schemas alone.
- Keep runtime, framework, and deployment ownership in the Target Project. POM adds no MCP runtime.

## Output

- selected mode and interface inventory;
- source-cited findings or proposed contracts;
- compatibility and security impact;
- implementation changes, when approved;
- scenario and efficiency evidence;
- unresolved decisions.

## Memory Impact

Record only durable interface contracts, consequential compatibility decisions, and verified operating guidance in enabled POM modules. Do not archive transient audit output by default.
