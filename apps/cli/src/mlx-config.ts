export const DEFAULT_MODEL =
    process.env.MLX_MODEL?.trim() || "mlx-community/Qwen2.5-Coder-3B-Instruct-4bit";

const parsedMaxTokens = Number.parseInt(
    process.env.MLX_MAX_TOKENS ?? "256",
    10
);

export const DEFAULT_MAX_TOKENS = 
    Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
        ? parsedMaxTokens: 256

export const MODEL_OPTIONS = [
    {
        id: "mlx-community/Qwen2.5-Coder-3B-Instruct-4bit",
        label: "Qwen2.5 Coder 3B Instruct 4-bit"
    },
    {
        id: "mlx-community/Qwen3.5-4B-OptiQ-4bit",
        label: "Qwen3.5 4b OptiQ 4-bit"
    },
] as const