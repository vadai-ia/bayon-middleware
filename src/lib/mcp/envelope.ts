/**
 * Builds the Whaapy response envelope and wraps it in the MCP `content` block.
 *
 * Per the Whaapy spec, the tool returns `content: [{ type: "text", text }]`
 * where `text` is a JSON string of the envelope. Objects/arrays live INSIDE
 * that JSON as real structures — never double-serialized as strings
 * (ERRORES.md #4). Only the top-level `content[0].text` is a string, as the
 * MCP protocol itself requires.
 */

import { MCP_SAFETY_READ_ONLY, MCP_TOOL_NAME } from "@/lib/constants";
import type { McpError, McpStatus, WhaapyEnvelope } from "@/lib/mcp/types";

/**
 * Shape the MCP SDK expects back from a tool handler. The index signature keeps
 * this assignable to the SDK's `CallToolResult` (which allows extra fields like
 * `_meta`/`structuredContent`) without pulling SDK types into this module.
 */
export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError: boolean;
  [key: string]: unknown;
}

interface BuildEnvelopeOptions<TData> {
  ok: boolean;
  status: McpStatus;
  data: TData;
  startedAt: number;
  errors?: McpError[];
  nextQuestion?: string;
  /** Marks a business-level failure for the MCP `isError` flag. */
  isError?: boolean;
}

/**
 * Construct the tool result. `durationMs` is measured from `startedAt` so the
 * agent can see how fast the tool answered.
 */
export function buildToolResult<TData>(
  opts: BuildEnvelopeOptions<TData>,
  now: number,
): ToolResult {
  const envelope: WhaapyEnvelope<TData> = {
    ok: opts.ok,
    status: opts.status,
    data: opts.data,
    toolName: MCP_TOOL_NAME,
    safety: MCP_SAFETY_READ_ONLY,
    durationMs: Math.max(0, now - opts.startedAt),
  };

  if (opts.errors && opts.errors.length > 0) envelope.errors = opts.errors;
  if (opts.nextQuestion) envelope.nextQuestion = opts.nextQuestion;

  return {
    content: [{ type: "text", text: JSON.stringify(envelope) }],
    isError: opts.isError ?? false,
  };
}
