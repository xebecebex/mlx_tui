import { Box, Text } from "ink";

import type { WorkbenchConfig } from "@workbench/core";

interface HeaderProps {
    config: WorkbenchConfig;
}

export function Header({ config }: HeaderProps) {
    return (
        <Box
            borderStyle="round"
            paddingX={1}
            flexDirection="column">
            <Text bold color="cyan">CANNA CORE HARNESS</Text>
            <Text>Provider: {config.provider}</Text>
            <Text>Model: {config.model}</Text>
            <Text dimColor> Workspace: {config.workspaceRoot}</Text>
        </Box>
    );
}