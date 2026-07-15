# Fixture 04 — Mixed migration with ordering, compatibility, and rollback

Type: mixed migration. Interfaces: APPLICABLE (ordering + compatibility contracts).

## Source spec (input to planning)

Migrate a service's user store from a single `full_name` column to separate `first_name` and `last_name` columns, with zero downtime.

- The database is PostgreSQL **>= 13**.
- Ordering constraint: add the new columns and backfill them BEFORE any read path uses them; drop `full_name` only AFTER all read and write paths use the new columns.
- Compatibility constraint: during the migration, the write path must populate BOTH `full_name` and the new columns (dual-write) so a rollback is safe at every step.
- Rollback constraint: each step must be independently reversible; no step may drop `full_name` until a defined bake period has passed.
- Task 1: schema migration adding nullable `first_name`, `last_name`.
- Task 2: backfill existing rows from `full_name`.
- Task 3: switch write path to dual-write; switch read path to new columns.
- Task 4: after bake period, drop `full_name`.

## Expected manifest

Exact global constraints every applicable task must preserve:

- PostgreSQL `>= 13`.
- Zero-downtime: no destructive step before dependents migrate.
- Dual-write during migration (write path populates both old and new columns).
- Each step independently reversible; `full_name` not dropped before the bake period.

Shared interface / dependency / ordering contracts:

- Task 1 **produces** the nullable `first_name`/`last_name` schema; **used by** Tasks 2, 3, 4.
- Task 2 **consumes** the new schema; **produces** backfilled data; must run AFTER Task 1, BEFORE Task 3's read switch.
- Task 3 **consumes** backfilled data; **produces** dual-write + new read path; must run BEFORE Task 4.
- Task 4 **consumes** the fully-migrated read/write paths; **produces** the dropped `full_name`; must run only after the bake period.

Independence / sizing:

- Four ordered tasks is correct; the ordering and rollback constraints must appear as explicit cross-task contracts, not just prose.

Trap to avoid: dropping `full_name` in the same task that adds the new columns; omitting the dual-write compatibility window; losing the ordering dependency between backfill and read-switch.
