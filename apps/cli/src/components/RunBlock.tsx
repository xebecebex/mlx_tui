import { Box, Text } from "ink";

export interface RunBlockData {
  id: string;
  prompt: string;
  result: string;
}

interface RunBlockProps {
  run: RunBlockData;
}

export function RunBlock({ run }: RunBlockProps) {
  return (
    <Box
      borderStyle="round"
      paddingX={1}
      paddingY={1}
      marginBottom={1}
      flexDirection="column"
    >
      <Text bold color="green">
        USER
      </Text>

      <Text>
        {run.prompt}
      </Text>

      <Box marginTop={1}>
        <Text bold color="yellow">
          STATUS
        </Text>
      </Box>

      <Text dimColor>
        inference not connected
      </Text>

      <Box marginTop={1}>
        <Text bold color="cyan">
          OUTPUT
        </Text>
      </Box>

      <Text>
        {run.result}
      </Text>
    </Box>
  );
}