import { Box, Text } from "ink";

import type { RunRecord } from "@workbench/core";

interface MLXRunBlockProps {
    run: RunRecord | null;
}

function formatNumber(
    value: number | null | undefined,
    digits = 2,
): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return "n/a";
    }

    return value.toFixed(digits);
}

function formatMemory(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
        return "n/a";
    }

    return `${(bytes / (1024 ** 3)).toFixed(3)} GiB`;
}

export function MLXRunBlock({ run }: MLXRunBlockProps) {
    if (!run) {
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color="cyan" bold>
                    MLX RUN
                </Text>

                <Text dimColor>
                    Запрос, чтобы увидеть метрики.
                </Text>
            </Box>
        );
    }

    const metrics = run.metrics;
    const usage = run.usage;

    return (
        <Box 
            borderStyle="round"
            borderColor={run.status === "success" ? "green": "red"}
            paddingX={1}
            flexDirection="column"
            marginTop={1}
        >
            <Text color="cyan" bold>
                MLX RUN {run.status.toUpperCase()}
            </Text>

            <Text>Model: {run.modelId}</Text>

            <Text>
                Tokens: {usage?.inputTokens ?? "n/a"} prompt
                {" / "}
                {usage?.outputTokens ?? "n/a"} generated
            </Text>

            <Text>
                Prompt speed:{" "}
                {formatNumber(metrics?.promptTokenPerSecond)} tokens/s
            </Text>

            <Text>
                Generation speed:{" "}
                {formatNumber(metrics?.generationTokenPerSecond)} tokens/s
            </Text>

            <Text>
                Time to first token:{" "}
                {formatNumber(metrics?.timeToFirstTokenMs)} ms
            </Text>

            <Text>
                Duration:{" "}
                {formatNumber(metrics?.durationMs)} ms
            </Text>

            <Text>
                MLX active memory:{" "}
                {formatMemory(metrics?.mlxActiveMemoryBytes)}
            </Text>

            <Text>
                MLX peak memory:{" "}
                {formatMemory(metrics?.mlxPeakMemoryBytes)}
            </Text>

            <Text>
                Process RSS:{" "}
                {formatMemory(metrics?.processRssBytes)}
            </Text>

            {run.errorMessage ? (
                <Text color="red">
                    Error: {run.errorMessage}
                </Text>
            ) : null}

            <Text dimColor>
                Run ID: {run.runId}
            </Text>

            <Text dimColor>
                Saved in data/runs.jsonl
            </Text>
        </Box>
    );
}