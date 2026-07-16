import type { MCPToolArgs, MCPToolName, MCPToolResult } from "@/lib/mcp/types";

type MCPResponse<T> = {
  ok: boolean;
  tool: string;
  result: T;
  fallback?: boolean;
  message?: string;
  code?: string;
};

/**
 * Call an MCP tool through the local `/api/mcp` proxy.
 * Keeps Gemini keys server-side; works in the browser without the MCP SDK.
 */
export async function callMCPTool<T extends MCPToolName>(
  tool: T,
  args: MCPToolArgs[T],
): Promise<MCPToolResult[T]> {
  const response = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, arguments: args }),
  });

  const payload = (await response.json().catch(() => null)) as
    | MCPResponse<MCPToolResult[T]>
    | { message?: string; code?: string }
    | null;

  // Successful tool result (including synthesize fallback with result body)
  if (payload && "result" in payload && payload.result != null) {
    return payload.result;
  }

  if (response.status === 429) {
    throw new Error(
      payload && "message" in payload && payload.message
        ? payload.message
        : "Too many requests — please wait a moment.",
    );
  }

  throw new Error(
    payload && "message" in payload && payload.message
      ? payload.message
      : `MCP tool "${tool}" failed (${response.status})`,
  );
}
