import { LOG_STATUS_LABELS, MCP_LOG_STATUS } from "@/lib/constants";
import type { McpLogStatus } from "@/lib/logs/types";
import { cn } from "@/lib/utils";

/**
 * Status pill for a log row. Uses the Bayón palette meaningfully:
 * red = error, calmer blue = success, navy = no results, yellow = timeout.
 */
const STATUS_STYLES: Record<McpLogStatus, string> = {
  [MCP_LOG_STATUS.SUCCESS]: "bg-bayon-blue/10 text-bayon-blue",
  [MCP_LOG_STATUS.NO_RESULTS]: "bg-bayon-navy/10 text-bayon-navy",
  [MCP_LOG_STATUS.ERROR]: "bg-bayon-red/10 text-bayon-red",
  [MCP_LOG_STATUS.TIMEOUT]: "bg-bayon-yellow/25 text-bayon-navy",
};

const DOT_STYLES: Record<McpLogStatus, string> = {
  [MCP_LOG_STATUS.SUCCESS]: "bg-bayon-blue",
  [MCP_LOG_STATUS.NO_RESULTS]: "bg-bayon-navy",
  [MCP_LOG_STATUS.ERROR]: "bg-bayon-red",
  [MCP_LOG_STATUS.TIMEOUT]: "bg-bayon-yellow",
};

export function LogStatusBadge({ status }: { status: McpLogStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[status])} />
      {LOG_STATUS_LABELS[status]}
    </span>
  );
}
