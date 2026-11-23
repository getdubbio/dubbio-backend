# Module name

Template for `src/modules/<name>/README.md`. Create it in the same PR that creates the module.
Source of truth for the module's public surface. Contracts stay in `docs/api.md`, [queue.md](queue.md) and [errors.md](errors.md); link to them, don't copy them.

## What it does

One or two lines: the responsibility of this module, and what it does not do.

## How to use it

The public service methods other modules may call, with a short example.

```ts
// constructor(private readonly example: ExampleService) {}
// await example.doThing(studioId, input);
```

## Endpoints

| Method | Path | Purpose                   |
| ------ | ---- | ------------------------- |
|        |      | Details in `docs/api.md`. |

## Events/jobs

| Kind  | Name | Produced or consumed        |
| ----- | ---- | --------------------------- |
| job   |      | Details in `docs/queue.md`. |
| event |      |                             |

## Env vars

| Variable | Required | Default | Purpose                          |
| -------- | -------- | ------- | -------------------------------- |
|          |          |         | Declared in `src/config/env.ts`. |

## Gotchas

- Non-obvious rules, ordering constraints, idempotency, studio scoping.
