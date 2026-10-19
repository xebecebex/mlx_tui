# Architecture Decisions

## ADR-001: TypeScript owns the harness

TypeScript owns:

- TUI and application state;
- provider selection and common provider contracts;
- agent runtime and tool orchestration;
- subagents, skills and permissions;
- workflow execution;
- benchmark orchestration and trace management.

The TUI must not implement inference logic.

## ADR-002: MLX uses a native Python bridge

MLX and MLX-LM are Python libraries.

The local inference backend will be implemented as a separate
Python service that directly calls MLX-LM APIs.

The TypeScript application will communicate with this service
through a documented local transport.

The first implementation will use loopback HTTP and
newline-delimited JSON (NDJSON) streaming.

## ADR-003: Provider-independent application contracts

The runtime consumes normalized messages, provider events,
tool definitions, usage information and performance metrics.

A provider-specific response must be normalized before it
reaches the runtime or TUI.

Unknown measurements must not be presented as exact values.

## ADR-004: One active local model by default

The first MLX implementation will allow one active local
model at a time.

Model switching and unloading must be explicit operations.

Subagents will execute sequentially by default on a machine
with 8 GB of unified memory.

## ADR-005: Workflows are data, not UI logic

Workflow definitions will be versioned YAML or JSON documents.

The editor will manipulate a workflow schema.

The workflow engine will execute that schema independently
of the TUI.

## ADR-006: Inspiration is not implementation reuse

Warp, Claude Code, Harness² and Hy-Memory are separate
reference projects.

Their concepts will be evaluated and adapted to Workbench's
architecture. Code reuse requires a separate review of source,
version, license and compatibility.