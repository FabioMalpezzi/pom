# Fixture 01 — Multi-task code feature with a version floor and a shared API

Type: multi-task code feature. Interfaces: APPLICABLE.

## Source spec (input to planning)

Add rate limiting to the public HTTP API of a Node.js service.

- The limiter must use the `@acme/token-bucket` library, **version 3.2.0 or newer** (3.x only; 4.x is not yet allowed because it drops the sync API the service relies on).
- A new module `RateLimiter` must expose `check(key: string): { allowed: boolean; retryAfterMs: number }` and `reset(key: string): void`. This is the interface every later task depends on.
- Task A implements `RateLimiter` and its unit tests.
- Task B wires `RateLimiter` into the HTTP middleware, calling `check` per request and returning HTTP 429 with a `Retry-After` header derived from `retryAfterMs`.
- Task C adds an admin endpoint that calls `RateLimiter.reset` for a given key.
- All tasks must keep Node.js **>= 18** (the service's floor) and must not add a second rate-limiting dependency.

## Expected manifest

Exact global constraints every applicable task must preserve:

- `@acme/token-bucket` version floor `>= 3.2.0`, and `< 4.0.0` (3.x only, sync API).
- Node.js `>= 18`.
- No second rate-limiting dependency.

Shared interface (produced once, consumed by later tasks):

- `RateLimiter.check(key: string): { allowed: boolean; retryAfterMs: number }`
- `RateLimiter.reset(key: string): void`

Expected dependency/interface contracts:

- Task A **produces** `RateLimiter` (both methods); **used by** B and C.
- Task B **consumes** `RateLimiter.check`; **produces** the 429 + `Retry-After` middleware behavior.
- Task C **consumes** `RateLimiter.reset`.

Independence / sizing:

- Three tasks is correct; do not split `RateLimiter` implementation from its unit tests into separate tasks.

Trap to avoid: inconsistent method signature across tasks (e.g., B calling `check(key, cost)` or `retryAfter` in seconds instead of `retryAfterMs`).
