# 0001. Use Vitest as the test runner

- **Status:** Proposed
- **Date:** 2026-11-25
- **Author:** Ahmed Ghozy

## Context

The repo has no test runner yet: `package.json` has no `test` script and no test dependency. Upcoming AI work (segmentize, translation prompt) is pure TypeScript logic that needs unit tests, and other modules will need them too, so the runner is a repo-wide choice.

Constraints from the current setup:

- ESM: `"type": "module"` in `package.json`, `module` and `moduleResolution` set to `nodenext` in `tsconfig.json`, so imports use `.js` specifiers for `.ts` files.
- Node `>=22`, pnpm.
- NestJS with `emitDecoratorMetadata` for dependency injection.
- CI runs `typecheck`, `lint` and `build`; tests would be one more step.

## Options considered

| Option                     | Pros                                                                                                                                                                  | Cons                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Vitest                  | Runs ESM and TypeScript as they are, including `.js` specifiers, with no build step. One dev dependency. Jest-like API (`describe`, `it`, `expect`). Fast watch mode. | Uses esbuild, which does not emit decorator metadata: tests that boot a Nest testing module with DI need the `unplugin-swc` plugin later.                       |
| B. Jest (`ts-jest` or SWC) | The NestJS default; most examples use it.                                                                                                                             | ESM support is still experimental (`--experimental-vm-modules`); `.js` specifiers need a `moduleNameMapper`; several packages and config files to keep in sync. |
| C. `node:test` (built in)  | No dependency.                                                                                                                                                        | Does not run TypeScript with `.js` specifiers directly: needs a build before every run or a loader such as `tsx`. Fewer assertion and mocking helpers.          |

## Decision

Use Vitest, with `pnpm test` running `vitest run --passWithNoTests` and spec files named `*.spec.ts` next to the code they test.

## Consequences

- `pnpm test` exists and passes on an empty suite, so it can be added to CI now.
- `*.spec.ts` files are excluded from `tsconfig.build.json`, so they never reach `dist/`.
- Unit tests of plain functions work with no extra config. Tests that need Nest dependency injection will need `unplugin-swc` and a `vitest.config.ts`; that is a follow-up when the first such test is written.
- Undo: remove the `vitest` dev dependency, the `test` script and the spec files.
