import { z } from "zod";

import type { ProviderId } from "./types.js";

const EnvironmentSchema = z.object({
  WORKBENCH_PROVIDER: z
    .enum(["mlx", "openai-compatible", "anthropic"])
    .default("mlx"),

  WORKBENCH_MODEL: z
    .string()
    .min(1)
    .default(
      "mlx-community/Qwen2.5-Coder-3B-Instruct-4bit",
    ),

  MLX_BRIDGE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:8765"),

  WORKBENCH_WORKSPACE: z
    .string()
    .min(1)
    .default("."),
});

export interface WorkbenchConfig {
  provider: ProviderId;
  model: string;
  mlxBridgeUrl: string;
  workspaceRoot: string;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorkbenchConfig {
  const result = EnvironmentSchema.safeParse({
    WORKBENCH_PROVIDER: env.WORKBENCH_PROVIDER,
    WORKBENCH_MODEL: env.WORKBENCH_MODEL,
    MLX_BRIDGE_URL: env.MLX_BRIDGE_URL,
    WORKBENCH_WORKSPACE: env.WORKBENCH_WORKSPACE,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const field = issue.path.join(".");
        return `${field}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `Invalid Workbench configuration:\n${details}`,
    );
  }

  const parsed = result.data;

  return {
    provider: parsed.WORKBENCH_PROVIDER,
    model: parsed.WORKBENCH_MODEL,
    mlxBridgeUrl: parsed.MLX_BRIDGE_URL,
    workspaceRoot: parsed.WORKBENCH_WORKSPACE,
  };
}