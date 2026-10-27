import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { randomUUID } from "node:crypto";

import {
    RunStore,
    type ModelMessage,
    type PerfomanceMetrics,
    type RunRecord,
} from "@workbench/core";

import { MLXProvider } from "../providers/mlx-provider.js";
import { MLXRunBlock } from "../components/MLXRunBlock.js";

import {
    DEFAULT_MAX_TOKENS,
    DEFAULT_MODEL,
    MODEL_OPTIONS,
} from "../mlx-config.js";
import { isModuleNamespaceObject } from "node:util/types";

interface ChatScreenProps {
    onBack?: () => void;
}

interface DisplayMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

function errorMessage(error: unknown): string{
    return error instanceof Error
        ? error.message : String(error);
}

function emptyMetrics(): PerfomanceMetrics {
    return {
        timeToFirstTokenMs: null,
        promptTokenPerSecond: null,
        generationTokenPerSecond: null,
        durationMs: null,
        mlxActiveMemoryBytes: null,
        mlxPeakMemoryBytes: null,
        processRssBytes: null,
    };
}

export function ChatScreen({ onBack }: ChatScreenProps){
    const { exit } = useApp();

    const provider = useMemo(
        () => new MLXProvider(),
        [],
    );

    const store = useMemo(
        () => new RunStore(),
        [],
    );

    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [notice, setNotice] = useState("");
    const [lastRun, setLastRun] = useState<RunRecord | null>(null);

    useEffect(()=> {
        return () => provider.close();
    }, [provider]);

    const handleSubmit = async (rawInput: string): Promise<void> =>{
        const raw = rawInput.trim();

        if (!raw || busy) {
            return;
        }

        if (raw === "/help") {
            setNotice(
                [
                    "/model - показать быстрые варианты",
                    "/model <ID> - выбрать модель",
                    "/clear - очистить историю диалога",
                    "/back - вернуться",
                    "/exit - завершить сеанс",
                ].join("\n"),
            );
            return;
        }

        if (raw === "/model") {
            setNotice(MODEL_OPTIONS
                .map((item) => '${item.id} - ${item.label}').join("\n"),
            );
            return;
        }

        if (raw.startsWith("/model")) {
            const selectedModel = raw.slice("/model ".length).trim();

            if (!selectedModel) {
                setNotice("Укажите идентификатор модели.");
                return;
            }

            setModel(selectedModel);
            setNotice(
                'Выбрана модель ${selectedModel}. Она загрузиться при следующем запросе.',
            );
            return;
        }

        if (raw === "/clear") {
            setMessages([]);
            setLastRun(null);
            setNotice("Диалог очищен. История data/runs.jsonl сохранена.",

            );
            return;
        }

        if (raw === "/back") {
            provider.close();

            if (onBack) {
                onBack();
            } else {
                exit();
            }

            return;
        }

        if (raw === "/exit" || raw === "/quit") {
            provider.close();
            exit();
            return;
        }

        if (raw.startsWith("/")) {
            setNotice('Неизвестная команда: ${raw}. Введите /help.');
            return;
        }

        const userMessage: ModelMessage = {
            role: "user",
            content: raw,
        };

        //Передачем предыдущую историю вместе с новым сообщением.
        const requestMessages: ModelMessage[] = [
            ...messages
            .filter((item) => item.content.trim().length > 0)
            .map((item) => ({
                role: item.role,
                content: item.content,
            })),
            userMessage,
        ];

        const userId = randomUUID();
        const assistantId = randomUUID();
        const runId = randomUUID();
        const startedAt = new Date().toISOString();

        setMessages((current) => [
            ...current,
            {id: userId, role: "user", content: raw,},
            {id: assistantId,role: "assistant",content: "",},
        ]);

        setBusy(true);
        setNotice("");
        setStatus("Starting MLX worker...");

        let finalRecord: RunRecord | null = null;

        try {
            const result = await provider.generate({
                providerId: "mlx",
                modelId: model,
                messages: requestMessages,
                maxTokens: DEFAULT_MAX_TOKENS,
            },
            {
                onStatus: (message) => {
                    setStatus(message);
                },

                onEvent: (event) => {
                    if (event.type !== "text_delta") {
                        return;
                    }

                    setMessages((current) => 
                        current.map((item) => 
                            item.id === assistantId
                                ?{
                                    ...item,
                                    content: item.content + event.text,
                                }: item,
                            ),
                        );
                },
            },
        
        );
        //Записываем точный финальный текст из результата провайдера.
        setMessages((current) => 
            current.map((item) =>
                item.id === assistantId
                    ? {...item, content: result.text}: item,),);
        
        finalRecord = {
            runId,
            providerId: "mlx",
            modelId: model,
            starterAt: startedAt,
            completedAt: new Date().toISOString(),
            status: "success",
            usage: result.usage,
            metrics: result.metrics,
            input: requestMessages,
            output: result.text,
            finishReason: result.finishReason,
        };

        setLastRun(finalRecord);
        setStatus("Generation completed");
        } catch (error) {
            const message = errorMessage(error);

            finalRecord = {
                runId,
                providerId: "mlx",
                modelId: model,
                starterAt: startedAt,
                completedAt: new Date().toDateString(),
                status: "failed",
                usage: {
                    inputTokens: null,
                    outputTokens: null,
                    source: "unknown",
                },
                metrics: emptyMetrics(),
                input: requestMessages,
                output: "",
                finishReason: null,
                errorMessage: message,
            };

            setLastRun(finalRecord);
            setStatus("Generation failed");
            setNotice(
                'MLX error: ${message}',
            );
        } finally {
            if (finalRecord) {
                try {
                    await store.append(finalRecord);

                    setStatus(
                        finalRecord.status === "success"
                        ? "Completed - run daved": "Failed - run saved",
                    );
                } catch (error) {
                    setStatus("Run could not be saved");
                    setNotice(
                        'Ошибка записи data/run.jsonl: ${errorMessage(error)}',
                    );
                }
            }
            setBusy(false);
        }

    };

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            provider.close();
            exit();
            return;
        }

        if (busy) {
            return;
        }

        if (key.return) {
            const value = draft.trim();
            setDraft("");

            if (value) {
                void handleSubmit(value);
            }

            return;
        }

        if (key.backspace || key.delete) {
            setDraft((current) => current.slice(0, -1));
            return;
        }

        if (!key.ctrl && !key.meta && input) {
            setDraft((current) => current + input);
        }
    });

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="column" marginBottom={1}>
                <Text color="cyan" bold>
                    CANNA AGENTIC CORE
                </Text>
                <Text dimColor>
                    PROVIDER: MLX - MODEL: {model}
                </Text>
                <Text color={busy ? "yellow" : "green"}>
                    {status}
                </Text>
            </Box>

            <Box flexDirection="column">
                {messages.map((message)=>(
                    <Box 
                        key={message.id}
                        flexDirection="column"
                        marginBottom={1}
                    >
                        <Text
                            color={message.role === "user" ? "green" : "cyan"}
                            bold
                        >
                            {message.role.toUpperCase()}
                        </Text>
                        <Text>
                            {message.content || (busy ? "...": "")}
                        </Text>
                    </Box>
                ))}
            </Box>

            <MLXRunBlock run={lastRun} />

            {notice ? (
                <Box marginTop={1}>
                    <Text color="yellow">{notice}</Text>
                </Box>
            ): null}

            <Box
                borderStyle="round"
                borderColor={busy ? "gray" : "green"}
                paddingX={1}
                marginTop={1}
            >
                <Text color="green">
                    {busy ? "RUNNING": ">"}{" "}
                </Text>
                <Text>
                    {busy ? "Генерация...": draft}
                </Text>

                {!busy ? <Text color="gray">█</Text>: null}
            </Box>

            <Text dimColor>
                Enrer: send · /model: select model  · /clear: clear history · CTRL+C: exit
            </Text>
        </Box>
    );

}

