"""Guard predicates for spec_evolution.

Names map one-to-one with guards[].name in
experiments/workflow-modeling/examples/spec-evolution.yaml.
Docstrings reproduce verbatim the YAML's description: field.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from spec_evolution import TransitionContext


def guard_has_completion_verification_gate(context: "TransitionContext") -> bool:
    """The spec declares an explicit completion verification gate. Required
    to move from accepted to complete. The gate combines Goal-Backward
    Check, Scenario Tests, and Semantic Validation as defined in
    CONTEXT.md.
    """
    return context.get("has_completion_verification_gate") is True


def guard_superseding_spec_accepted(context: "TransitionContext") -> bool:
    """The spec that supersedes this one is itself in state accepted or
    complete. Prevents supersession by drafts.
    """
    return context.get("superseding_spec_accepted") is True
