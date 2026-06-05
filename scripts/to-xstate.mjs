#!/usr/bin/env node
//
// to-xstate.mjs — convert a POM workflow or pipeline YAML into an
// XState v5 input MachineConfig JSON.
//
// Round 2 coverage:
//   - state-invoke         -> XState invoke on the state node, with
//                             onDone branches discriminated by the
//                             child's terminal state via _terminal guards;
//   - event-invoke         -> rewritten as an intermediate __invoking_*
//                             state with an invoke, since XState attaches
//                             invokes to state nodes, not to transitions;
//   - pipeline             -> root machine with one __member_<idx> state
//                             per pipeline member, each invoking the
//                             corresponding child workflow and using
//                             onDone branches keyed by terminal_state to
//                             move to the next member or to a final
//                             pipeline state;
//   - context_schema       -> preserved under meta.pom.context_schema;
//                             a documentary "input" example is also
//                             surfaced for stately.ai;
//   - invoke input/assign  -> mapped to invoke.input (input) and
//                             actions: assign (assign), keys preserved
//                             verbatim, values as documental strings.
//
// Output is JSON that can be pasted into stately.ai to obtain a
// visualization + offline-style review of the machine. The script does
// NOT call createMachine() and does NOT add a dependency to the POM repo.
//
// Usage:
//   node to-xstate.mjs <workflow-or-pipeline.yaml> [--out <output.json>]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
import yaml from "./require-yaml.mjs";
