import "dotenv/config";

import { render } from "ink";

import { App } from "./App.js";
import { loadConfig } from "@workbench/core";

function main(): void {
  try {
    const config = loadConfig();

    render(<App config={config} />, {
      exitOnCtrlC: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    process.stderr.write(
      `Failed to start MLX Agent Workbench:\n${message}\n`,
    );

    process.exitCode = 1;
  }
}

main();