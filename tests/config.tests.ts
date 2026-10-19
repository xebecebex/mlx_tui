import { describe, expect, it } from "vitest";

import { loadConfig } from "@workbench/core";

describe("loadConfig", () => {
  it("uses safe defaults when variables are absent", () => {
    const config = loadConfig({});

    expect(config.provider).toBe("mlx");

    expect(config.model).toBe(
      "mlx-community/Qwen2.5-Coder-3B-Instruct-4bit",
    );

    expect(config.mlxBridgeUrl).toBe(
      "http://127.0.0.1:8765",
    );
  });

  it("accepts an explicit provider and model", () => {
    const config = loadConfig({
      WORKBENCH_PROVIDER: "openai-compatible",
      WORKBENCH_MODEL: "example-model",
      MLX_BRIDGE_URL: "http://127.0.0.1:9000",
      WORKBENCH_WORKSPACE: "/tmp/example-workspace",
    });

    expect(config.provider).toBe("openai-compatible");
    expect(config.model).toBe("example-model");
    expect(config.mlxBridgeUrl).toBe(
      "http://127.0.0.1:9000",
    );
    expect(config.workspaceRoot).toBe(
      "/tmp/example-workspace",
    );
  });

  it("rejects an unsupported provider", () => {
    expect(() =>
      loadConfig({
        WORKBENCH_PROVIDER: "unsupported-provider",
      }),
    ).toThrow(/WORKBENCH_PROVIDER/);
  });

  it("rejects an invalid bridge URL", () => {
    expect(() =>
      loadConfig({
        MLX_BRIDGE_URL: "not-a-url",
      }),
    ).toThrow(/MLX_BRIDGE_URL/);
  });
});