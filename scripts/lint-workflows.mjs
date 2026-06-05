#!/usr/bin/env node
//
// lint-workflows.mjs - CLI wrapper for the POM workflow YAML validator.
//
// Usage:
//   node scripts/lint-workflows.mjs <file.yaml> [<file2.yaml> ...] \
//     [--out <report.md>] [--mermaid-dir <dir>]
//
// Reference: specs/SPEC-0006-workflow-modeling.md

import { runWorkflowLintCli } from './lib/workflow-lint-cli.mjs';

runWorkflowLintCli();
