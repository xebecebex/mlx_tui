export type ProviderId = 
    | "mlx"
    | "openai-compatible"
    | "anthropic";

export type MessageRole = 
    | "system"
    | "user"
    | "assistant"
    | "tool"

export interface ModelMessage {
    role: MessageRole;
    content: string;
    name?: string;
    toolCallId?: string;
}

export interface ProviderCapabilities {
    streaming: boolean;
    toolCalling: boolean;
    exactUsage: boolean;
    perfomanceMetrics: boolean;
    contextLimit?: number;
}

export interface ModelDescriptor {
    providerId: ProviderId;
    modelId: string;
    displayName?: string;
    local: boolean;
    capabilities: ProviderCapabilities;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export type MeasurementSource =
    | "provider"
    | "mlx"
    | "estimated"
    | "unknown";

export interface TokenUsage {
    inputTokens: number | null;
    outputTokens: number | null;
    source: MeasurementSource;
}

export interface PerfomanceMetrics {
    timeToFirstTokenMs: number | null;
    promptTokenPerSecond: number | null;
    generationTokenPerSecond: number | null;
    durationMs: number | null;

    mlxActiveMemoryBytes: number | null;
    mlxPeakMemoryBytes: number | null;
    processRssBytes: number | null;
}

export type ProviderEvent = 
    | {
        type: "text_delta";
        text: string;
    }
    |{
        type: "tool_call";
        call: ToolCall;
    }
    | {
        type: "usage";
        usage: TokenUsage;
    }
    | {
        type: "metrics";
        metrics: Partial<PerfomanceMetrics>;
    }
    |{
        type: "done";
    }
    | {
        type: "error";
        message: string;      
    };

export interface runSummary {
    runId: string;
    providerId: ProviderId;
    modelId: string;
    starterAt: string;
    completedAt?: string;

    status: "running" | "success" | "failed" | "cancelled";

    usage?: TokenUsage;
    metrics?: PerfomanceMetrics;
}
