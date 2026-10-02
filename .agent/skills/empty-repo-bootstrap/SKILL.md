---
name: empty-repo-bootstrap
description: Initialize a genuinely empty software repository with a usable, verified development environment, especially Windows plus VS Code. Use when asked to bootstrap, scaffold, or create the initial project structure in an empty repository; support multiple languages, language-specific defaults, frontend/backend connectivity, shared checks, pre-commit, CI, documentation, and end-to-end verification.
---

# Empty repository bootstrap

Create an initial, working development environment for an empty repository. Treat the scope as scaffolding, not as an invitation to implement unspecified product features. Default to Windows and VS Code. Follow the user's language and tool choices where feasible; otherwise use the presets here. First inspect the repository and applicable `AGENTS.md` files. Never overwrite existing content: if the repository is not empty, stop before scaffolding and report what exists.

## 1. Confirm scope before changing files

Inspect repository status and contents, then confirm these items in one concise question before implementation:

1. Languages to use (including which are frontend/backend, if relevant).
2. What to build and the minimum useful behavior.
3. Directory layout.
4. Required or preferred tools, versions, and package managers.
5. Whether to use CI; if yes, provider and runner OS.

Present the defaults so the user can correct them. Use repository context and any explicit request to prefill answers. Do not ask again about information the user already supplied. Unspecified items use the defaults below. A user can specify only some fields; retain defaults for the rest. If the choices materially conflict, ask about the conflict before proceeding. Do not block on optional details such as product name; choose a neutral placeholder and make it easy to change.

## 2. Defaults

For a web application with no stack specified, use:

| Area | Default |
| --- | --- |
| Frontend | TypeScript, React, Vite, npm |
| Backend | Python, FastAPI, uv |
| Frontend format/lint/types/tests | Prettier, ESLint, `tsc`, Vitest |
| Python format/lint/types/tests | Ruff, mypy, pytest |
| Editor | VS Code on Windows |
| Git hooks | pre-commit framework; fast format/lint checks |
| CI | Ask provider and runner OS; do not infer from editor/OS |

Create the smallest vertical slice: a React page with a button that calls a FastAPI health/check endpoint, and visible idle, loading, success, and failure states. Use a Vite development proxy or an equivalent explicit local API URL configuration. Include `.env.example` files with non-secret values, explain each variable, and ensure real `.env` files are ignored. Do not add authentication or a database unless requested.

For other languages or frameworks, select conventional, currently supported tools and pin all relevant tool/runtime versions. Verify version-sensitive facts against official tool documentation when needed. Do not force the React/FastAPI slice on a non-web or user-specified project.

The standard top-level layout is:

```text
/
├── frontend/                 # When a frontend is in scope
├── backend/                  # When a backend is in scope
├── .vscode/
├── .github/                  # Only for GitHub Actions
├── .pre-commit-config.yaml
└── README.md
```

Adapt directories to requested languages and architecture. Keep project-specific config in the repository. VS Code workspace settings should set only repository-shared behavior; do not dictate personal theme, font, UI layout, or other personal preferences.

## 3. Build language environments completely

For every language in scope, provide and document:

- Formatter and static analysis, with consistent exclusions.
- Type checking where supported and relevant.
- Runtime, compiler, and tool versions pinned or constrained reproducibly.
- Dependency manager and committed lockfile.
- Run, debug, test, and build commands.
- A minimal meaningful automated test and its local/CI environment.
- Ignore rules for dependencies, generated output, caches, virtual environments, secrets, and IDE-local data.

Use one shared command entry point at the repository root (`Makefile`, `justfile`, npm scripts, or a small cross-platform script chosen for the stack). Make documented commands work in Windows PowerShell and, when CI is used, the selected runner. Avoid shell-specific quoting and path assumptions. Pin Node using a committed version file and `engines`; pin Python with `.python-version` and `requires-python`; commit `uv.lock`. Pin formatter/linter/type-check/test tool versions in the lockfile or dedicated config. Do not use floating `latest` in committed setup.

For the default stack, expose common commands for format, lint, typecheck, test, build, and a fast `check` command. Keep a distinction between commands that modify files (`format`) and commands that only report issues (`format:check` or equivalent). Document that the formatter may change files; contributors should inspect and include those changes, then rerun checks. Never imply a check is clean merely because formatting rewrote files.

### Python build contract

Make Python build concrete, not an alias for “run the app.” Use a standards-based `pyproject.toml` package configuration and `python -m build` to generate an sdist and wheel into `backend/dist/`. The build must validate packaging metadata and inclusion of the backend package. Add a build verification step that creates the artifacts, installs the wheel into a fresh isolated environment, imports the application/package, and runs a lightweight app/CLI smoke check without using the source checkout for imports. Keep generated `dist/` and temporary environments ignored. In CI run build verification after tests and type checks. If the project deliberately is not distributable, document a similarly concrete artifact and its validation instead.

## 4. VS Code setup

Create `.vscode/extensions.json`, `.vscode/settings.json`, `.vscode/launch.json`, and `.vscode/tasks.json` as appropriate. Recommend extensions by identifier. Configure workspace formatting-on-save and formatter selection per language. Keep settings limited to shared project conventions. Provide:

- Separate frontend and backend start tasks.
- A compound task to start both services.
- Debug configurations for the frontend browser/client and Python FastAPI server, plus a compound debug configuration when supported.
- Tasks for common checks/tests/builds, with clear labels and working directories.

Ensure the chosen debugger configuration uses paths and interpreter selection that work on Windows. Do not hardcode a contributor's absolute paths or secret values. Document any prerequisite VS Code extensions and how to select the project Python interpreter.

## 5. Shared checks, hooks, and CI

Use pre-commit. On commit, run only fast formatter and static-analysis checks for staged relevant files; avoid the full test suite or long builds in the hook. Configure local hooks and CI to call the same underlying tool configurations and root command entry point. Do not create a second set of divergent lint rules in CI.

When a hook formatter edits files, allow pre-commit to report the modified files and stop that commit attempt; tell the contributor to review/stage the changes and retry. Never silently stage unrelated changes. Ensure hook revisions and tools are pinned.

Ask for CI provider and runner OS independently of the Windows development environment. If CI is selected, add only that provider's configuration. CI should install pinned dependencies from lockfiles and run full format checks, lint, type checks, tests, and builds. On Windows/Linux differences, use an OS matrix only when requested or necessary; otherwise use the chosen runner. Ensure newline behavior is stable with `.gitattributes` and consistent formatter/editor settings.

## 6. Documentation and verification

README must include prerequisites, Windows setup, dependency installation, environment variable setup, frontend/backend individual start commands, simultaneous start, API URL/proxy behavior, browser/API debug steps, every check/test/build command, pre-commit installation, and CI behavior. Keep descriptions of environment variables beside the example file and in README. Never put real secrets in sample files.

Before editing, check actual emptiness and current branch/tooling context. After implementation, execute available checks rather than only inspecting configuration:

1. Install dependencies from lockfiles.
2. Run formatting check, static analysis, type checking, tests, and each language build.
3. Start frontend and backend and exercise the HTTP request from the frontend; verify all four UI states are implemented and the success path is observed. Exercise failure behavior where practical by stopping the API or using an invalid endpoint.
4. Verify the Python built wheel imports from the isolated install.
5. Verify VS Code task/config paths and root commands on Windows-compatible syntax.

If the environment cannot run a check (for example, Windows-only tooling unavailable on the current host), state the exact unrun step and why; do not claim it passed. Fix failures before calling setup complete. Report created structure, chosen defaults and overrides, commands run with results, and any remaining limitation.

See [stack presets and verification details](references/stack-presets.md) for default command and configuration guidance.
