/**
 * Сохранение завершенных запусков в data/runs.jsonl, 
 * включая успешные ответы и ошибки генерации.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RunRecord } from "./types.js";

const CORE_SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(CORE_SOURCE_DIR, "../../..");

export class RunStore {
    private readonly filePath: string;

    constructor(filePath = "data/runs.jsonl") {
        this.filePath = resolve(PROJECT_ROOT, filePath);
    }

    async append(record: RunRecord): Promise<void> {
        await mkdir(dirname(this.filePath), {
            recursive: true,
        });

        await appendFile(
            this.filePath,
            `${JSON.stringify(record)}\n`,
            "utf8",
        );
    }
}