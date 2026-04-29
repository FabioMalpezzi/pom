# Agent Conversation Examples

Examples of how to interact with an LLM agent using POM. These work with any agent (Claude Code, Codex, Gemini, Kiro) as long as the project's `AGENTS.md` contains the POM section.

## Build the initial wiki

**You:**
```
Read pom/skills/wiki.md in build mode and create the wiki.
```

**Agent will:**
1. Read `pom/skills/wiki.md` → sees mode `build` → reads `pom/prompts/10-build-wiki.md`
2. Read `PROJECT_STATE.md`, `README.md`, `AGENTS.md`, `pom.config.json`
3. Scan available sources (code, specs, ADRs, mockups, docs)
4. Propose a wiki taxonomy and first batch of pages
5. Wait for your approval

**You:**
```
Looks good. Start with the core entities and processes.
```

**Agent will:**
1. Create `wiki/index.md` from `pom/templates/WIKI_INDEX_TEMPLATE.md`
2. Create `wiki/log.md` from `pom/templates/WIKI_LOG_TEMPLATE.md`
3. Create the approved wiki pages from `pom/templates/WIKI_PAGE_TEMPLATE.md`
4. Update the index and log
5. Run `npm run pom:lint` if available
6. Report what was created and what remains for the next batch

---

## Bootstrap a new project

**You:**
```
Read pom/skills/seed.md and set up POM for this project.
```

**Agent will:**
1. Analyze the repository structure
2. Check Git status
3. Propose a minimal POM structure (wiki, decisions, PROJECT_STATE)
4. Wait for your approval before creating anything

**You:**
```
I want wiki and decisions. No mockups, no docs for now. Tests are in __tests__/ next to code.
```

**Agent will:**
1. Create `AGENTS.md` with the POM section
2. Create `wiki/index.md` and `wiki/log.md`
3. Create `decisions/` directory
4. Create `PROJECT_STATE.md`
5. Create `pom.config.json` with `tests.root` set to match your existing structure
6. Run lint

---

## Resume after a pause

**You:**
```
Read pom/skills/pulse.md and update PROJECT_STATE.md.
```

**Agent will:**
1. Read `README.md`, `AGENTS.md`, existing `PROJECT_STATE.md`
2. Read recent ADRs and `wiki/log.md`
3. Update `PROJECT_STATE.md` with current state, priorities, next actions, and files to read

---

## Query the wiki

**You:**
```
Read pom/skills/wiki.md in query mode. How does the SLA escalation work?
```

**Agent will:**
1. Read `wiki/index.md` to find relevant pages
2. Read the relevant wiki pages
3. Answer with citations to wiki pages
4. If the answer has reusable value, propose archiving it as a new wiki page

**You:**
```
Good answer. Archive it as a wiki page.
```

**Agent will:**
1. Create the new wiki page
2. Update `wiki/index.md` and `wiki/log.md`

---

## Turn a spec into tasks

**You:**
```
Read pom/skills/plan.md and create a task plan from specs/ai-triage.md.
```

**Agent will:**
1. Read the spec
2. Read `pom.config.json` for test/docs/source conventions
3. Create a task plan with phases, tasks, steps, and verifications
4. Include user scenarios and done criteria
5. Wait for your approval

---

## End-of-session handoff

**You:**
```
Read pom/skills/handoff.md and update the project state.
```

**Agent will:**
1. Summarize what changed during the session
2. Update `PROJECT_STATE.md` if the operating context changed
3. Update `wiki/log.md` if wiki pages changed
4. Run lint/tests
5. Report completed tasks, open tasks, and where to resume next session

---

## Check wiki health

**You:**
```
Read pom/skills/wiki.md in lint mode and check wiki health.
```

**Agent will:**
1. Read `wiki/index.md` and `wiki/log.md`
2. List all wiki pages
3. Check for broken links, orphan pages, short pages, missing index entries
4. Produce a health report
5. Propose fixes and wait for approval

---

## Run a temporary experiment

**You:**
```
Read pom/skills/spike.md. I want to try replacing our REST API with GraphQL.
```

**Agent will:**
1. Clarify the experiment objective
2. Propose working on branch `exp/graphql-migration`
3. Wait for your approval before touching any files
4. At the end, propose consolidation: discard, archive in analysis, promote to spec/ADR, or generate a task plan
