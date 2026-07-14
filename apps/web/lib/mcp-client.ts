import type { MCPToolArgs, MCPToolName, MCPToolResult } from "@/lib/mcp/types";

type MCPResponse<T> = {
  ok: boolean;
  tool: string;
  result: T;
  fallback?: boolean;
  message?: string;
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
    | { message?: string }
    | null;

  if (!response.ok || !payload || !("result" in payload)) {
    throw new Error(
      payload && "message" in payload && payload.message
        ? payload.message
        : `MCP tool "${tool}" failed (${response.status})`,
    );
  }

  return payload.result;
}
