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

Add CodePulse to your GitHub Actions workflow to track health over time:

```yaml
# .github/workflows/codepulse.yml
name: CodePulse Health Check

on: [push, pull_request]

jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx codepulse scan --format json --min-score 85 > codepulse-report.json
      - uses: actions/upload-artifact@v4
        with:
          name: codepulse-report
          path: codepulse-report.json
```

## Pricing

| Plan | Price | Features |
|------|-------|---------|
| **Free** | $0 | CLI health score, all 5 modules, unlimited local scans |
| **Pro** | $12/mo | HTML reports, historical trend tracking, config presets |
| **Team** | $49/mo | CI dashboard, policy enforcement, team-wide visibility |

> Pro and Team tiers coming soon. [Join the waitlist →](https://github.com/choddenbach/codepulse)

## License

MIT — see [LICENSE](LICENSE).
