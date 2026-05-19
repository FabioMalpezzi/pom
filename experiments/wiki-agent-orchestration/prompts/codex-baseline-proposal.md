# Codex Baseline Proposal Prompt

Use this prompt for the first file-based baseline of the POM web wiki agent extension.

## Inputs

- One wiki event JSON file matching `contracts/wiki-event.schema.json`.
- The repository files referenced by the event.
- The proposal schema in `contracts/agent-proposal.schema.json`.

## Instruction

Read the event and the referenced repository files. Produce exactly one structured proposal matching `contracts/agent-proposal.schema.json`.

Do not edit files.
Do not create files.
Do not apply the proposal.
Do not treat the wiki event as a decision.

The proposal must:

- state the event it answers;
- list every file read and why it was read;
- distinguish facts from assumptions;
- identify gaps or contradictions;
- choose the authoritative destination for any promoted content;
- state the approval requirement;
- explain why the change must not be applied automatically.

If the source authority, destination, or approval requirement is unclear, return a `clarification` proposal instead of a document update proposal.

## Expected Output

Return JSON only. No Markdown wrapper.
