import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import type {
    GenerateInputs,
    GenerationHandlers,
    GenerationResult,
    PerfomanceMetrics,
    ProviderEvent,
    TokenUsage,
} from "@workbench/core";

type WorkerEvent =
    | { type: "ready" }
    | {
        type: "status";
        requestId: string;
        message: string;
    }
    | {
        type: "token";
        requestId: string;
        text: string;
    }
    | {
        type: "done";
        requestId: string;
        usage: TokenUsage;
        metrics: Partial<PerfomanceMetrics>;
        finishReason: string | null;
    }
    | {
        type: "error";
        requestId: string | null;
        message: string;
    };

interface PendingRequest {
    requestId: string;
    modelId: string;
    startedAt: number;
    firstTokenAt: number | null;
    text: string;
    handlers: GenerationHandlers;
    resolve: (result: GenerationResult) => void;
    reject: (error: Error) => void;
}

const PROVIDER_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(PROVIDER_DIR, "../../../..");

const WORKER_PATH = resolve(
    PROJECT_ROOT,
    "apps/cli/python/mlx_worker.py",
);

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : String(error);
}

export class MLXProvider {
    private child: ChildProcessWithoutNullStreams | null = null;
    private ready = false;
    private startPromise: Promise<void> | null = null;

    private resolveStart: (() => void) | null = null;
    private rejectStart: ((error: Error) => void) | null = null;

    private pending: PendingRequest | null = null;
    private stderrTail = "";

    private ensureWorker(): Promise<void> {
        if (this.child && this.ready) {
            return Promise.resolve();
        }

        if (this.startPromise) {
            return this.startPromise;
        }

        const configuredPython =
            process.env.PYTHON_BIN?.trim() || ".venv/bin/python";

        const pythonExecutable = isAbsolute(configuredPython)
            ? configuredPython
            : configuredPython.includes("/")
                ? resolve(PROJECT_ROOT, configuredPython)
                : configuredPython;

        this.startPromise = new Promise<void>((resolveStart, rejectStart) => {
            this.resolveStart = resolveStart;
            this.rejectStart = rejectStart;
            this.stderrTail = "";

            const child = spawn(
                pythonExecutable,
                [WORKER_PATH],
                {
                    cwd: PROJECT_ROOT,
                    env: {
                        ...process.env,
                        PYTHONUNBUFFERED: "1",
                    },
                    stdio: "pipe",
                },
            );

            this.child = child;

            const lines = createInterface({
                input: child.stdout,
            });

            lines.on("line", (line) => {
                this.handleLine(line);
            });

            child.stderr.on("data", (chunk: Buffer) => {
                this.stderrTail = (
                    this.stderrTail + chunk.toString("utf8")
                ).slice(-4000);
            });

            child.once("error", (error) => {
                const failure = new Error(
                    `Cannot start MLX worker with "${pythonExecutable}": ${error.message}`,
                );

                this.rejectStart?.(failure);
                this.failPending(failure);
                this.resetWorker();
            });

            child.once("exit", (code, signal) => {
                const details = this.stderrTail
                    ? `\nPython stderr:\n${this.stderrTail}`
                    : "";

                const failure = new Error(
                    `MLX worker exited (code=${String(code)}, signal=${String(signal)}).${details}`,
                );

                this.rejectStart?.(failure);
                this.failPending(failure);
                this.resetWorker();
            });
        });

        return this.startPromise;
    }

    private resetWorker(): void {
        this.child = null;
        this.ready = false;
        this.startPromise = null;
        this.resolveStart = null;
        this.rejectStart = null;
    }

    private failPending(error: Error): void {
        const request = this.pending;

        this.pending = null;
        request?.reject(error);
    }

    private handleLine(line: string): void {
        let event: WorkerEvent;

        try {
            event = JSON.parse(line) as WorkerEvent;
        } catch {
            this.failPending(
                new Error(`Invalid JSON from MLX worker: ${line}`),
            );
            return;
        }

        if (event.type === "ready") {
            this.ready = true;
            this.resolveStart?.();

            this.resolveStart = null;
            this.rejectStart = null;
            return;
        }

        const pending = this.pending;

        if (!pending) {
            return;
        }

        if (event.type === "status") {
            if (event.requestId === pending.requestId) {
                pending.handlers.onStatus?.(event.message);
            }

            return;
        }

        if (event.type === "error") {
            if (
                event.requestId !== null &&
                event.requestId !== pending.requestId
            ) {
                return;
            }

            const failure = new Error(event.message);

            pending.handlers.onEvent?.({
                type: "error",
                message: event.message,
            });

            this.pending = null;
            pending.reject(failure);
            return;
        }

        if (event.requestId !== pending.requestId) {
            return;
        }

        if (event.type === "token") {
            if (event.text.length === 0) {
                return;
            }

            if (pending.firstTokenAt === null) {
                pending.firstTokenAt = performance.now();
            }

            pending.text += event.text;

            const delta: ProviderEvent = {
                type: "text_delta",
                text: event.text,
            };

            pending.handlers.onEvent?.(delta);
            return;
        }

        if (event.type === "done") {
            const completedAt = performance.now();
            const durationMs = completedAt - pending.startedAt;

            const metrics: PerfomanceMetrics = {
                timeToFirstTokenMs:
                    pending.firstTokenAt === null
                        ? null
                        : pending.firstTokenAt - pending.startedAt,

                promptTokenPerSecond:
                    event.metrics.promptTokenPerSecond ?? null,

                generationTokenPerSecond:
                    event.metrics.generationTokenPerSecond ?? null,

                durationMs,

                mlxActiveMemoryBytes:
                    event.metrics.mlxActiveMemoryBytes ?? null,

                mlxPeakMemoryBytes:
                    event.metrics.mlxPeakMemoryBytes ?? null,

                processRssBytes:
                    event.metrics.processRssBytes ?? null,
            };

            pending.handlers.onEvent?.({
                type: "usage",
                usage: event.usage,
            });

            pending.handlers.onEvent?.({
                type: "metrics",
                metrics,
            });

            pending.handlers.onEvent?.({
                type: "done",
            });

            const result: GenerationResult = {
                runId: pending.requestId,
                providerId: "mlx",
                modelId: pending.modelId,
                text: pending.text,
                usage: event.usage,
                metrics,
                finishReason: event.finishReason,
            };

            this.pending = null;
            pending.resolve(result);
        }
    }

    async generate(
        input: GenerateInputs,
        handlers: GenerationHandlers = {},
    ): Promise<GenerationResult> {
        if (input.providerId !== "mlx") {
            throw new Error(
                `MLXProvider cannot handle provider "${input.providerId}"`,
            );
        }

        if (this.pending) {
            throw new Error(
                "An MLX generation is already running",
            );
        }

        await this.ensureWorker();

        if (!this.child || !this.ready) {
            throw new Error("MLX worker is not ready");
        }

        const requestId = randomUUID();

        return new Promise<GenerationResult>((resolveResult, rejectResult) => {
            const pending: PendingRequest = {
                requestId,
                modelId: input.modelId,
                startedAt: performance.now(),
                firstTokenAt: null,
                text: "",
                handlers,
                resolve: resolveResult,
                reject: rejectResult,
            };

            this.pending = pending;

            const payload = {
                type: "generate",
                requestId,
                modelId: input.modelId,
                messages: input.messages,
                maxTokens: input.maxTokens,
            };

            this.child!.stdin.write(
                `${JSON.stringify(payload)}\n`,
                (error) => {
                    if (
                        error &&
                        this.pending?.requestId === requestId
                    ) {
                        this.pending = null;
                        rejectResult(error);
                    }
                },
            );
        });
    }

    close(): void {
        this.failPending(
            new Error("MLX worker was closed"),
        );

        this.child?.kill("SIGTERM");
        this.resetWorker();
    }
}