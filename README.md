# CodePulse

[![npm version](https://img.shields.io/npm/v/codepulse)](https://www.npmjs.com/package/codepulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/choddenbach/codepulse/ci.yml)](https://github.com/choddenbach/codepulse/actions)

**Instant codebase health scores — for every engineer, every CI run.**

CodePulse scans your project and gives you an actionable health score across five dimensions: complexity, dependencies, test coverage, documentation, and security. No signup. No cloud. Runs entirely on your machine.

## Quick Start

```bash
npx codepulse scan
```

That's it. CodePulse auto-detects your project and prints a full health report.

## Example Output

```
 CodePulse — Codebase Health Report
 Scanned: ./src  (42 files)

 ┌──────────────────────┬───────┬────────────────────────────────────────────┐
 │ Module               │ Score │ Summary                                    │
 ├──────────────────────┼───────┼────────────────────────────────────────────┤
 │ Complexity           │  82   │ 3 high-complexity functions flagged.       │
 │ Dependencies         │  90   │ 1 outdated package, 0 known vulnerabilities│
 │ Test Coverage        │  65   │ 14 of 42 source files lack test coverage.  │
 │ Documentation        │  78   │ 9 exported functions missing JSDoc.        │
 │ Security             │ 100   │ No obvious security red flags found.       │
 └──────────────────────┴───────┴────────────────────────────────────────────┘

 Overall Health Score: 83 / 100  ████████░░  Good
```

## Features

- **Complexity Analysis** — Finds deeply nested code and high cyclomatic complexity using AST parsing
- **Dependency Health** — Flags outdated packages and known vulnerabilities from your lockfile
- **Test Coverage** — Measures how many source files have corresponding test files
- **Documentation Quality** — Checks exported functions for JSDoc coverage
- **Security Signals** — Detects hard-coded secrets, `eval()` usage, plain HTTP endpoints, and more

## Installation

```bash
# Run without installing
npx codepulse scan

# Install globally
npm install -g codepulse

# Or with bun
bun add -g codepulse
```

## Usage

```bash
# Scan current directory
codepulse scan

# Scan a specific path
codepulse scan ./src

# Run specific modules only
codepulse scan --module complexity,security

# Ignore generated or fixture paths
codepulse scan --exclude fixtures,src/generated

# Export an HTML report
codepulse scan --format html

# Write a JSON report directly to disk
codepulse scan --format json --output reports/codepulse.json

# Output raw JSON
codepulse scan --format json

# Enforce a CI score threshold
codepulse scan --min-score 85

# Fail on warning-or-higher findings
codepulse scan --fail-on warning
```

## Configuration

CodePulse auto-discovers `codepulse.config.json` starting from the scan target and walking up to the filesystem root. CLI flags always win over config values.

```json
{
  "format": "json",
  "modules": ["complexity", "security", "tests"],
  "exclude": ["fixtures", "src/generated"],
  "outputPath": "reports/codepulse.json",
  "minScore": 85,
  "failOnSeverity": "warning"
}
```

Common use cases:

- Set a team-wide `minScore` for CI gating
- Save a default module subset for faster scans
- Ignore generated code, fixtures, or vendored directories
- Make machine-readable JSON the default in automation
- Escalate failures for warning/error findings without changing local habits

## CI Integration

CodePulse now ships with a ready-to-use GitHub Actions workflow at `.github/workflows/ci.yml`.

It does four things on every push and pull request:

- Installs dependencies with Bun
- Runs the full test suite
- Builds the CLI bundle
- Generates JSON and HTML reports, then uploads them as workflow artifacts

The bundled workflow uses `--min-score 65 --fail-on none` so the current repository stays green while still producing reports on every run. Teams can ratchet that threshold upward over time as code health improves.

If you want to copy the setup into another repository, start from this workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  test-build-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build
      - run: |
          mkdir -p reports
          bun ./bin/codepulse scan --format json --output reports/codepulse-report.json --min-score 65 --fail-on none .
          bun ./bin/codepulse scan --format html --output reports/codepulse-report.html --min-score 65 --fail-on none .
      - uses: actions/upload-artifact@v4
        with:
          name: codepulse-reports
          path: reports/
```

Recommended rollout path:

1. Start with report-only automation using `--fail-on none`
2. Add a repo-level `codepulse.config.json` with your default `exclude` paths and `outputPath`
3. Raise `minScore` gradually as the codebase improves
4. Switch to `--fail-on warning` or `--fail-on error` when you want policy enforcement

## Pricing

| Plan | Price | Features |
|------|-------|---------|
| **Free** | $0 | CLI health score, all 5 modules, unlimited local scans |
| **Pro** | $12/mo | HTML reports, historical trend tracking, config presets |
| **Team** | $49/mo | CI dashboard, policy enforcement, team-wide visibility |

> Pro and Team tiers coming soon. [Join the waitlist →](https://github.com/choddenbach/codepulse)

## License

MIT — see [LICENSE](LICENSE).
