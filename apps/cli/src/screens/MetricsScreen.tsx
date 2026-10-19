import { Box, Text, useInput } from "ink";

interface MetricsScreenProps {
  runCount: number;
  onClose: () => void;
}

export function MetricsScreen({
  runCount,
  onClose,
}: MetricsScreenProps) {
  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === "q") {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" paddingX={1}>
        <Text bold color="cyan">
          Performance Lab
        </Text>
      </Box>

      <Box
        borderStyle="round"
        padding={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text>
          Интерфейсных run-блоков: {runCount}
        </Text>

        <Text>
          Time to first token: —
        </Text>

        <Text>
          Prompt tokens / second: —
        </Text>

        <Text>
          Generation tokens / second: —
        </Text>

        <Text>
          Total generation duration: —
        </Text>

        <Text>
          MLX allocator memory: —
        </Text>

        <Text>
          Process RSS: —
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Значения появятся после подключения измерений
          в реальной генерации.
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