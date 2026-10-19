import { Box, Text, useInput } from "ink";

interface WorkflowStudioProps {
  onClose: () => void;
}

export function WorkflowStudio({
  onClose,
}: WorkflowStudioProps) {
  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === "q") {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" paddingX={1}>
        <Text bold color="cyan">
          Workflow Studio
        </Text>
      </Box>

      <Text>
        Проектирование агентных сценариев через блоки
      </Text>

      <Box
        borderStyle="round"
        padding={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text color="green">
          [START]
        </Text>

        <Text dimColor>
              │
        </Text>

        <Text color="cyan">
          [AGENT]
        </Text>

        <Text dimColor>
              │
        </Text>

        <Text color="yellow">
          [TOOL]
        </Text>

        <Text dimColor>
              │
        </Text>

        <Text color="magenta">
          [END]
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Это демонстрационный граф. Он пока не исполняется
          и не сохраняется на диск.
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          Нажми q или Esc, чтобы вернуться в чат.
        </Text>
      </Box>
    </Box>
  );
}