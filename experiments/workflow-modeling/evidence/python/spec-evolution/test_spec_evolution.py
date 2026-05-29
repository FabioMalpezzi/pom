"""Tests derived from experiments/workflow-modeling/examples/spec-evolution.yaml.

Same 15 scenarios as the TypeScript evidence
(evidence/typescript/spec-evolution/spec-evolution.test.ts).
Categories follow the prompt's `scenarios` mode:
- positive transitions (allowed),
- refused (from, event) pairs (not declared in the model),
- guard true / guard false branches for guarded transitions,
- terminal-state checks (no transition out, except where
  re_entry_allowed: true is declared).

Run: python3 -m unittest test_spec_evolution.py
"""

import unittest

from spec_evolution import (
    Allowed,
    Refused,
    RE_ENTRY_ALLOWED_STATES,
    TERMINAL_STATES,
    apply_transition,
)

ALL_EVENTS = (
    "submit_for_review",
    "request_changes",
    "accept",
    "reject",
    "implement_and_verify",
    "supersede",
    "withdraw",
)


class TestPositiveTransitions(unittest.TestCase):
    def test_draft_to_under_review_on_submit(self):
        r = apply_transition("draft", "submit_for_review")
        self.assertEqual(r, Allowed(next_state="under_review"))

    def test_under_review_to_draft_on_request_changes(self):
        r = apply_transition("under_review", "request_changes")
        self.assertEqual(r, Allowed(next_state="draft"))

    def test_under_review_to_accepted_on_accept(self):
        r = apply_transition("under_review", "accept")
        self.assertEqual(r, Allowed(next_state="accepted"))

    def test_under_review_to_rejected_on_reject(self):
        r = apply_transition("under_review", "reject")
        self.assertEqual(r, Allowed(next_state="rejected"))

    def test_draft_to_withdrawn_on_withdraw(self):
        r = apply_transition("draft", "withdraw")
        self.assertEqual(r, Allowed(next_state="withdrawn"))


class TestGuardBranches(unittest.TestCase):
    def test_accepted_to_complete_guard_true(self):
        r = apply_transition(
            "accepted",
            "implement_and_verify",
            {"has_completion_verification_gate": True},
        )
        self.assertEqual(r, Allowed(next_state="complete"))

    def test_accepted_to_complete_guard_false(self):
        r = apply_transition(
            "accepted",
            "implement_and_verify",
            {"has_completion_verification_gate": False},
        )
        self.assertEqual(r, Refused(reason="guard_false"))

    def test_accepted_to_superseded_guard_true(self):
        r = apply_transition(
            "accepted",
            "supersede",
            {"superseding_spec_accepted": True},
        )
        self.assertEqual(r, Allowed(next_state="superseded"))

    def test_accepted_to_superseded_guard_false(self):
        r = apply_transition(
            "accepted",
            "supersede",
            {"superseding_spec_accepted": False},
        )
        self.assertEqual(r, Refused(reason="guard_false"))

    def test_complete_to_superseded_via_re_entry(self):
        r = apply_transition(
            "complete",
            "supersede",
            {"superseding_spec_accepted": True},
        )
        self.assertEqual(r, Allowed(next_state="superseded"))


class TestRefusedTransitions(unittest.TestCase):
    def test_draft_does_not_accept_accept(self):
        r = apply_transition("draft", "accept")
        self.assertEqual(r, Refused(reason="no_matching_transition"))

    def test_accepted_does_not_accept_submit(self):
        r = apply_transition("accepted", "submit_for_review")
        self.assertEqual(r, Refused(reason="no_matching_transition"))

    def test_accepted_does_not_accept_withdraw(self):
        # After review starts the spec cannot be retracted quietly.
        r = apply_transition("accepted", "withdraw")
        self.assertEqual(r, Refused(reason="no_matching_transition"))


class TestTerminalStates(unittest.TestCase):
    def test_terminals_without_re_entry_refuse_every_event(self):
        re_entry = set(RE_ENTRY_ALLOWED_STATES)
        for state in TERMINAL_STATES:
            if state in re_entry:
                continue
            for event in ALL_EVENTS:
                r = apply_transition(
                    state,
                    event,
                    {
                        "has_completion_verification_gate": True,
                        "superseding_spec_accepted": True,
                    },
                )
                self.assertEqual(
                    r.kind,
                    "refused",
                    f"expected {state} on {event} to be refused",
                )

    def test_complete_refuses_every_event_except_supersede(self):
        for event in ALL_EVENTS:
            r = apply_transition(
                "complete",
                event,
                {
                    "has_completion_verification_gate": True,
                    "superseding_spec_accepted": True,
                },
            )
            if event == "supersede":
                self.assertEqual(r, Allowed(next_state="superseded"))
            else:
                self.assertEqual(r.kind, "refused")


if __name__ == "__main__":
    unittest.main()
