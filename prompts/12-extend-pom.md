# Prompt - Extend POM

Use this prompt when the user wants to extend POM, add a methodological rule, create a new skill, modify templates/prompts, or automate a check.

```text
I want to extend POM.

Before modifying files:
1. clarify the extension objective;
2. determine whether it is a general POM rule or a project-specific adaptation;
3. read `README.md`, `skills/README.md`, `prompts/README.md`, `pom.config.json` if present, and `PROJECT_STATE.md` if present;
4. choose the smallest necessary level:
   - project config -> `pom.config.json`;
   - document shape -> `templates/`;
   - agent procedure -> `prompts/`;
   - recurring workflow -> `skills/`;
   - automatic check -> lint/script;
5. report impacts on AGENTS, README, PROJECT_STATE, and lint;
6. propose changes and wait for approval if the extension changes structure, workflow, or operating rules.

Rules:
- do not turn a local preference into a general rule without a reason;
- do not duplicate rules across README, prompts, skills, and templates if a reference is enough;
- a skill must be short and point to a canonical prompt;
- a prompt must describe what to read, what to propose, when to ask for approval, and what to verify;
- a template must remain the starting point for real documents;
- lint should automate only stable and verifiable rules;
- if a change affects project restart, update `PROJECT_STATE.md`;
- if a structural decision changes, evaluate whether an ADR is needed.

Expected output:
- chosen extension level and rationale;
- files to modify;
- any new skill/prompt/template/config;
- lint/test checks to run;
- documentation and handoff impacts.

After changes:
1. run `npm run pom:lint`, if available;
2. update `PROJECT_STATE.md` if the operating method changed;
3. state what was extended and what was intentionally left out.
```
