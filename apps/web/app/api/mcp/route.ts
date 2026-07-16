import { NextRequest, NextResponse } from "next/server";
import { fallbackRecommendation } from "@/lib/mcp/fallback";
import { clientIpFromRequest, rateLimit } from "@/lib/rate-limit";
import { synthesizeRecommendation } from "@/lib/mcp/tools/synthesize";
import { getWeather } from "@/lib/mcp/tools/weather";
import type { MCPToolName } from "@/lib/mcp/types";
import type { MCPRecommendContext } from "@/lib/ranker/types";

type MCPRequestBody = {
  tool?: string;
  arguments?: unknown;
};

/** Soft cap: 10 tool calls / minute / IP (plan § security). */
const MCP_LIMIT = 10;
const MCP_WINDOW_MS = 60_000;

/**
 * MCP tool endpoint for the PWA.
 *
 * Default: runs tools in-process on Vercel (Open-Meteo + Gemini).
 * Optional: set MCP_GATEWAY_URL to proxy to a remote Python MCP gateway.
 */
export async function POST(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const limited = rateLimit(`mcp:${ip}`, MCP_LIMIT, MCP_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      {
        message:
          "Too many recommendation requests. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSec),
          "X-RateLimit-Limit": String(MCP_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: MCPRequestBody;

  try {
    body = (await req.json()) as MCPRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON.", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const tool = body.tool;
  if (tool !== "get_weather" && tool !== "synthesize_recommendation") {
    return NextResponse.json(
      {
        message:
          "Unknown tool. Expected get_weather or synthesize_recommendation.",
        code: "UNKNOWN_TOOL",
      },
      { status: 400 },
    );
  }

  const gatewayUrl = process.env.MCP_GATEWAY_URL;
  if (gatewayUrl) {
    return proxyToGateway(gatewayUrl, tool, body.arguments, limited.remaining);
  }

  try {
    const result = await dispatchLocalTool(tool, body.arguments);
    return NextResponse.json(
      { ok: true, tool, result },
      {
        headers: {
          "X-RateLimit-Limit": String(MCP_LIMIT),
          "X-RateLimit-Remaining": String(limited.remaining),
        },
      },
    );
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "MCP tool call failed";
    console.error(`[mcp] ${tool} failed:`, detail);

    if (tool === "synthesize_recommendation") {
      const context = body.arguments as MCPRecommendContext | undefined;
      if (context?.shortlist?.length) {
        return NextResponse.json({
          ok: true,
          tool,
          result: fallbackRecommendation(context),
          fallback: true,
          message: userFacingMcpError(detail),
          code: "SYNTHESIZE_FALLBACK",
        });
      }
    }

    return NextResponse.json(
      {
        message: userFacingMcpError(detail),
        code: "MCP_ERROR",
      },
      { status: 500 },
    );
  }
}

function userFacingMcpError(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes("gemini_api_key") || lower.includes("not configured")) {
    return "AI narrative is not configured on this deployment. Showing your ranker pick instead.";
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate")) {
    return "The AI service is busy right now. Showing your ranker pick instead.";
  }
  if (lower.includes("weather") || lower.includes("open-meteo")) {
    return "Could not fetch weather. Using a default forecast.";
  }
  return "Could not finish the recommendation request. Please try again.";
}

async function dispatchLocalTool(tool: MCPToolName, rawArgs: unknown) {
  if (tool === "get_weather") {
    const args = rawArgs as { lat?: unknown; lon?: unknown };
    const lat = Number(args?.lat);
    const lon = Number(args?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("get_weather requires numeric lat and lon");
    }
    return getWeather(lat, lon);
  }

  const context = rawArgs as MCPRecommendContext | null;
  if (!context?.shortlist?.length) {
    throw new Error("synthesize_recommendation requires a non-empty shortlist");
  }
  return synthesizeRecommendation(context);
}

async function proxyToGateway(
  gatewayUrl: string,
  tool: MCPToolName,
  args: unknown,
  remaining: number,
) {
  try {
    const response = await fetch(
      `${gatewayUrl.replace(/\/$/, "")}/mcp/tools/${tool}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args ?? {}),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            typeof payload.message === "string"
              ? userFacingMcpError(payload.message)
              : `Recommendation service error (${response.status})`,
          code: "GATEWAY_ERROR",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      { ok: true, tool, result: payload },
      {
        headers: {
          "X-RateLimit-Limit": String(MCP_LIMIT),
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  } catch (error) {
    console.error("[mcp] gateway unreachable:", error);
    return NextResponse.json(
      {
        message: "Could not reach the recommendation service. Please try again.",
        code: "GATEWAY_UNREACHABLE",
      },
      { status: 502 },
    );
  }
}
