import { spawn } from "node:child_process";

const steps = [
  {
    label: "vite build",
    command: "vite",
    args: ["build"],
  },
  {
    label: "prerender",
    command: "tsx",
    args: ["--tsconfig", "tsconfig.prerender.json", "scripts/prerender.tsx"],
  },
  {
    label: "server bundle",
    command: "esbuild",
    args: [
      "server/_core/index.ts",
      "--platform=node",
      "--packages=external",
      "--bundle",
      "--format=esm",
      "--outdir=dist",
    ],
  },
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    console.log(`[build] starting ${step.label}`);

    const child = spawn(step.command, step.args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("error", (error) => {
      reject(new Error(`[build] failed to start ${step.label}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[build] finished ${step.label}`);
        resolve();
        return;
      }

      reject(new Error(`[build] ${step.label} exited with code ${code ?? "unknown"}`));
    });
  });
}

for (const step of steps) {
  // eslint-disable-next-line no-await-in-loop
  await runStep(step);
}
