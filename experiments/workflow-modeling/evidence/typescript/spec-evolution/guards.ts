// Guard predicates for spec_evolution.
// Names map one-to-one with guards[].name in
// experiments/workflow-modeling/examples/spec-evolution.yaml.
// Docstrings reproduce verbatim the YAML's description: field.

import type { TransitionContext } from './spec-evolution.ts';

/**
 * The spec declares an explicit completion verification gate. Required
 * to move from accepted to complete. The gate combines Goal-Backward
 * Check, Scenario Tests, and Semantic Validation as defined in
 * CONTEXT.md.
 */
export function guardHasCompletionVerificationGate(
  context: TransitionContext,
): boolean {
  return context.hasCompletionVerificationGate === true;
}

/**
 * The spec that supersedes this one is itself in state accepted or
 * complete. Prevents supersession by drafts.
 */
export function guardSupersedingSpecAccepted(
  context: TransitionContext,
): boolean {
  return context.supersedingSpecAccepted === true;
}
