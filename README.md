# CodePulse

CodePulse scans a project directory and generates code health reports across complexity, dependencies, documentation, tests, and security.

## Install

```bash
bun install
```

## Usage

```bash
bun run scan
bun ./bin/codepulse scan ./src --module complexity,deps
bun ./bin/codepulse scan --format json
bun ./bin/codepulse scan --format html
```

When using `--format html`, CodePulse writes `codepulse-report.html` into the scanned directory.

## Test

```bash
bun test
```
