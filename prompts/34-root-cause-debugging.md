# Prompt - Root Cause Debugging

Use this prompt when a Target Project has a bug, failing test, failing build, performance problem, integration issue, or unexpected behavior. It is for application/project debugging, not POM method defects.

```text
I want to debug a Target Project problem by finding the root cause before changing implementation.

Before proposing a fix:
1. state the observed failure in concrete terms:
   - command, test, user action, endpoint, screen, job, or workflow;
   - expected behavior;
   - actual behavior;
   - error message, stack trace, log, status code, or timing evidence.
2. read project instructions and read `pom.config.json` when present to understand ownership, source roots, tests, and existing conventions.
3. identify Source Authority for this question: code, tests, logs, runtime config, docs, or external service behavior.
4. reproduce the failure when possible:
   - run the failing command or the smallest relevant test;
   - if not reproducible, gather logs, inputs, environment, versions, and exact user steps instead of guessing.
5. check recent changes:
   - current `git status`;
   - relevant diff;
   - recent commits when available;
   - dependency, config, environment, or data changes.

Root-cause investigation:
1. read the full error output before editing.
2. trace the failing path from symptom toward origin:
   - caller -> callee;
   - input -> transformation -> output;
   - request -> service -> database/cache/queue;
   - build/CI step -> script -> tool invocation.
3. compare with a working example in the same codebase when one exists.
4. list the material differences between broken and working paths.
5. form one concrete hypothesis:
   - "I think <cause> produces <failure> because <evidence>."
6. test that hypothesis with the smallest useful check:
   - focused test;
   - one-off script;
   - targeted log/instrumentation;
   - config diff;
   - data inspection;
   - reproducer command.
7. if the hypothesis fails, do not stack fixes. Return to evidence and form a new hypothesis.

Fix rules:
- Do not change implementation before the cause is identified or explicitly narrowed.
- If an outage or urgent user impact requires immediate action, make only a containment change, say it is containment, and keep the root-cause investigation open.
- Fix the source of the failure, not only the surfaced symptom.
- Change one cause at a time. Avoid "while here" cleanup and bundled refactors.
- Add a regression test, scenario test, or repeatable reproduction when there is a stable seam. If no automated seam exists, document the manual reproduction and why automation is not practical yet.
- If the third attempted fix fails, stop and discuss architecture, assumptions, or scope before attempting another fix.

Verification:
1. rerun the original failing command, scenario, or reproduction.
2. run the smallest adjacent regression check.
3. run broader tests/lint/build only as needed for the risk of the change.
4. if governed POM memory changed or the fix closes a significant task, use `skills/check.md` and then `skills/validate.md` when appropriate.

Memory impact:
- Update wiki, docs, task plans, or decisions only if the target project's adoption profile enables them and the result is reusable Operating Memory.
- Do not create wiki pages, ADRs, task plans, analysis, or tests when the adoption profile disables them.
- If the cause reveals a future improvement but should not be fixed now, use `skills/defer.md`.

Output:
- failure observed;
- reproduction status;
- evidence read;
- root cause or current hypothesis;
- fix or containment applied;
- verification commands and results;
- memory updates or reason none were made;
- remaining risk.
```
