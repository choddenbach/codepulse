const terminalFrames = [
  { text: "$ npx codepulse scan\n", className: "terminal-line-muted" },
  { text: "CodePulse v0.1.0\n", className: "terminal-line-good" },
  { text: "Scanning ./src...\n\n", className: "terminal-line-muted" },
  { text: "┌──────────────────────────────────────┐\n", className: "terminal-line-muted" },
  { text: "│  Overall Health: 83/100  Grade: B   │\n", className: "terminal-line-good" },
  { text: "└──────────────────────────────────────┘\n\n", className: "terminal-line-muted" },
  { text: "Complexity    █████████░░░  82/100\n", className: "terminal-line-good" },
  { text: "Dependencies  ██████████░░  90/100\n", className: "terminal-line-good" },
  { text: "Test Coverage ███████░░░░░  65/100\n", className: "terminal-line-warn" },
  { text: "Docs Quality  ████████░░░░  78/100\n", className: "terminal-line-warn" },
  { text: "Security      ████████████  100/100\n\n", className: "terminal-line-good" },
  { text: "Top findings:\n", className: "terminal-line-muted" },
  { text: "⚠ src/routes/report.ts:88 — 14 source files lack test coverage\n", className: "terminal-line-warn" },
  { text: "⚠ src/api/projects.ts:41 — Exported function missing JSDoc\n", className: "terminal-line-warn" },
  { text: "✖ src/auth/token.ts:17 — Potential hard-coded secret detected\n", className: "terminal-line-bad" },
];

const terminalOutput = document.querySelector("#terminal-output");
const copyButton = document.querySelector("#copy-command");
const installCommand = document.querySelector("#install-command");

if (terminalOutput) {
  startTerminalAnimation(terminalOutput);
}

if (copyButton && installCommand) {
  copyButton.addEventListener("click", async () => {
    const command = installCommand.textContent?.trim() ?? "npx codepulse scan";

    try {
      await navigator.clipboard.writeText(command);
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1600);
    } catch {
      copyButton.textContent = "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 1600);
    }
  });
}

function startTerminalAnimation(container) {
  let frameIndex = 0;

  const play = () => {
    container.textContent = "";
    frameIndex = 0;
    showNextFrame();
  };

  const showNextFrame = () => {
    if (frameIndex >= terminalFrames.length) {
      window.setTimeout(play, 2200);
      return;
    }

    const frame = terminalFrames[frameIndex];
    const line = document.createElement("span");
    line.className = frame.className;
    line.textContent = frame.text;
    container.append(line);
    container.scrollTop = container.scrollHeight;
    frameIndex += 1;

    const delay = frame.text.includes("Top findings") ? 560 : frame.text.includes("Overall Health") ? 420 : 160;
    window.setTimeout(showNextFrame, delay);
  };

  play();
}
