import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RunStore } from "../packages/core/src/run-store.js";
import type { RunRecord } from "../packages/core/src/types.js";

let temporaryDirectory: string | null = null;

afterEach(async () => {
    if (temporaryDirectory) {
        await rm(temporaryDirectory, {
            recursive: true,
            force: true,
        });
        temporaryDirectory = null;
    }
});

describe("RunStore", () => {
    it("Writes a run record as one jsonl line", async () => {
        // Добавляем явное утверждение типа 'as string' для пути
        const baseTmpDir = join(tmpdir(), "mlx-workbench-test") as string;
        
        temporaryDirectory = await mkdtemp(baseTmpDir);

        if (!temporaryDirectory) {
            throw new Error("Временная директория не была создана");
        }

        // Принудительно заставляем TS видеть здесь чистую строку
        const path = join(temporaryDirectory, "runs.jsonl") as string;
        const store = new RunStore(path);

        const record: RunRecord = {
            runId: "run-test-1",
            providerId: "mlx",
            modelId: "test/model",
            starterAt: "2026-10-20T10:00:00.000Z",
            completedAt: "2026-10-20T10:00:01.00Z",
            status: "success",
            usage: {
                inputTokens: 12,
                outputTokens: 6,
                source: "mlx",
            },
            metrics: {
                timeToFirstTokenMs: 100,
                promptTokenPerSecond: 120,
                generationTokenPerSecond: 30,
                durationMs: 1000,
                mlxActiveMemoryBytes: 1000,
                mlxPeakMemoryBytes: null,
                processRssBytes: 0,
            },

            input: [
                {
                    role: "user",
                    content: "Hello",
                },
            ],

            output: "Hello back",
            finishReason: "stop",
        };

        await store.append(record);

        const content = await readFile(path, "utf8");
        const lines = content.trim().split("\n");

        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0] as string)).toEqual(record);
    });
});

