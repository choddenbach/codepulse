import { normalizeSeverity, type AnalysisReport, type Finding } from "../types.ts";

export function renderHtmlReport(report: AnalysisReport): string {
  const moduleCards = report.modules
    .map(
      (moduleResult) => `
        <article class="card">
          <h3>${escapeHtml(moduleResult.label)}</h3>
          <div class="score-row">
            <strong>${moduleResult.score}/100</strong>
            <span>${escapeHtml(moduleResult.summary)}</span>
          </div>
          <div class="meter" aria-label="${escapeHtml(moduleResult.label)} score">
            <span style="width:${moduleResult.score}%"></span>
          </div>
        </article>`,
    )
    .join("");

  const findingsRows = report.findings.length
    ? report.findings.map((finding) => renderFindingRow(finding)).join("")
    : `<tr><td colspan="4">No notable findings.</td></tr>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodePulse Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #09111f;
        --panel: #132238;
        --panel-alt: #0e1a2b;
        --border: rgba(255, 255, 255, 0.12);
        --text: #edf3ff;
        --muted: #95a8c6;
        --accent: #5eead4;
        --accent-strong: #14b8a6;
        --danger: #fb7185;
        --warning: #fbbf24;
        --success: #4ade80;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #132238 0%, var(--bg) 50%, #050913 100%);
        color: var(--text);
      }

      main {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 48px 0 72px;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 24px;
        align-items: stretch;
      }

      .panel {
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 28px;
        backdrop-filter: blur(12px);
      }

      h1, h2, h3, p { margin-top: 0; }
      .eyebrow { color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; }
      .score {
        font-size: 72px;
        line-height: 1;
        margin: 12px 0 8px;
      }

      .grade-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(94, 234, 212, 0.14);
        color: var(--accent);
        font-weight: 700;
      }

      .meta {
        color: var(--muted);
        font-size: 14px;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }

      .card {
        background: var(--panel-alt);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 20px;
      }

      .score-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
        color: var(--muted);
      }

      .score-row strong {
        color: var(--text);
        font-size: 24px;
      }

      .meter {
        height: 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        overflow: hidden;
      }

      .meter span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent-strong), var(--accent));
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
        background: var(--panel-alt);
        border-radius: 18px;
        overflow: hidden;
      }

      th, td {
        text-align: left;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
      }

      th { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
      tr:last-child td { border-bottom: 0; }
      .severity { font-weight: 700; }
      .severity-error { color: var(--danger); }
      .severity-warning { color: var(--warning); }
      .severity-info { color: var(--success); }

      @media (max-width: 860px) {
        .hero { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="panel">
          <p class="eyebrow">CodePulse Report</p>
          <h1>Project health snapshot</h1>
          <p class="score">${report.overallScore}<span style="font-size: 28px; color: var(--muted)">/100</span></p>
          <p><span class="grade-badge">Grade ${escapeHtml(report.overallGrade)}</span></p>
          <p class="meta">Scanned path: ${escapeHtml(report.targetPath)}</p>
          <p class="meta">Generated: ${escapeHtml(report.generatedAt)}</p>
        </div>
        <div class="panel">
          <h2>Highlights</h2>
          <p>${escapeHtml(buildHighlights(report))}</p>
        </div>
      </section>

      <section>
        <h2>Module Breakdown</h2>
        <div class="cards">${moduleCards}</div>
      </section>

      <section>
        <h2>Detailed Findings</h2>
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Module</th>
              <th>Location</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>${findingsRows}</tbody>
        </table>
      </section>
    </main>
  </body>
</html>
`;
}

function buildHighlights(report: AnalysisReport): string {
  if (report.findings.length === 0) {
    return "All enabled modules are in good shape with no notable findings.";
  }

  const firstFinding = report.findings[0];
  return `${firstFinding.module} needs the most attention: ${firstFinding.message}`;
}

function renderFindingRow(finding: Finding): string {
  const locationPath = finding.filePath ?? finding.file;
  const location = locationPath ? `${locationPath}${finding.line ? `:${finding.line}` : ""}` : "—";
  const normalizedSeverity = normalizeSeverity(finding.severity);
  return `
    <tr>
      <td class="severity severity-${normalizedSeverity}">${escapeHtml(finding.severity)}</td>
      <td>${escapeHtml(finding.module ?? "general")}</td>
      <td>${escapeHtml(location)}</td>
      <td>${escapeHtml(finding.message)}</td>
    </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
