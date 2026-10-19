import { randomUUID } from "node:crypto";
import { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";

import type { WorkbenchConfig } from "@workbench/core";

import { Header } from "./components/Header.js";
import {
  RunBlock,
  type RunBlockData,
} from "./components/RunBlock.js";
import { MetricsScreen } from "./screens/MetricsScreen.js";
import { WorkflowStudio } from "./screens/WorkflowStudio.js";

type Screen = "chat" | "workflow" | "metrics";

interface AppProps {
  config: WorkbenchConfig;
}

export function App({ config }: AppProps) {
  const { exit } = useApp();

  const [screen, setScreen] = useState<Screen>("chat");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState(
    "Phase 0: интерфейс готов, подключение модели появится в Phase 1.",
  );

  const [runs, setRuns] = useState<RunBlockData[]>([]);

  useInput((input, key) => {
    if (screen !== "chat") {
      return;
    }

    if (key.return) {
      const submitted = draft.trim();

      if (!submitted) {
        return;
      }

      setDraft("");

      switch (submitted) {
        case ":help":
          setNotice(
            "Команды: :help, :workflow, :metrics, :clear, :quit",
          );
          return;

        case ":workflow":
          setScreen("workflow");
          return;

        case ":metrics":
          setScreen("metrics");
          return;

        case ":clear":
          setRuns([]);
          setNotice("История интерфейса очищена.");
          return;

        case ":quit":
          exit();
          return;
      }

      if (submitted.startsWith(":")) {
        setNotice(
          `Неизвестная команда: ${submitted}. Введи :help.`,
        );
        return;
      }

      const run: RunBlockData = {
        id: randomUUID(),
        prompt: submitted,
        result:
          "Инференс пока не подключён. На Phase 1 этот блок будет использовать общий Agent Runtime и выбранный провайдер.",
      };

      setRuns((current) => [...current, run].slice(-10));
      setNotice(
        "Запрос записан в TUI. Ответ модели пока не генерируется.",
      );

      return;
    }

    if (key.backspace || key.delete) {
      setDraft((current) => current.slice(0, -1));
      return;
    }

    if (key.ctrl && input.toLowerCase() === "u") {
      setDraft("");
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const normalized = input.replace(/[\r\n]/g, " ");
      setDraft((current) => current + normalized);
    }
  });

  if (screen === "workflow") {
    return (
      <WorkflowStudio
        onClose={() => setScreen("chat")}
      />
    );
  }

  if (screen === "metrics") {
    return (
      <MetricsScreen
        runCount={runs.length}
        onClose={() => setScreen("chat")}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Header config={config} />

      <Box
        flexDirection="column"
        marginTop={1}
        marginBottom={1}
      >
        {runs.length === 0 ? (
          <Box
            borderStyle="round"
            padding={1}
            flexDirection="column"
          >
            <Text bold>
              Новый run
            </Text>
            <Text dimColor>
              Введи запрос или команду. На Phase 0
              инференс ещё не вызывается.
            </Text>
          </Box>
        ) : (
          runs.map((run) => (
            <RunBlock key={run.id} run={run} />
          ))
        )}
      </Box>

      <Box
        borderStyle="round"
        paddingX={1}
        flexDirection="column"
      >
        <Text color="green" bold>
          ❯
        </Text>

        <Text>
          {draft || "Введи задачу или :help"}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {notice}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Provider: {config.provider} | Model: {config.model}
        </Text>
      </Box>

      <Box>
        <Text dimColor>
          Enter — отправить · Ctrl+U — очистить ввод · Ctrl+C — выход
        </Text>
      </Box>
    </Box>
  );
}
