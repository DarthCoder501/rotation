import { NextRequest, NextResponse } from "next/server";
import { fallbackRecommendation } from "@/lib/mcp/fallback";
import { synthesizeRecommendation } from "@/lib/mcp/tools/synthesize";
import { getWeather } from "@/lib/mcp/tools/weather";
import type { MCPToolName } from "@/lib/mcp/types";
import type { MCPRecommendContext } from "@/lib/ranker/types";

type MCPRequestBody = {
  tool?: string;
  arguments?: unknown;
};

/**
 * MCP tool endpoint for the PWA.
 *
 * Default: runs tools in-process on Vercel (Open-Meteo + Gemini).
 * Optional: set MCP_GATEWAY_URL to proxy to a remote Python MCP gateway.
 */
export async function POST(req: NextRequest) {
  let body: MCPRequestBody;

  try {
    body = (await req.json()) as MCPRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const tool = body.tool;
  if (tool !== "get_weather" && tool !== "synthesize_recommendation") {
    return NextResponse.json(
      { message: "Unknown tool. Expected get_weather or synthesize_recommendation." },
      { status: 400 },
    );
  }

  const gatewayUrl = process.env.MCP_GATEWAY_URL;
  if (gatewayUrl) {
    return proxyToGateway(gatewayUrl, tool, body.arguments);
  }

  try {
    const result = await dispatchLocalTool(tool, body.arguments);
    return NextResponse.json({ ok: true, tool, result });
  } catch (error) {
    if (tool === "synthesize_recommendation") {
      const context = body.arguments as MCPRecommendContext | undefined;
      if (context?.shortlist?.length) {
        return NextResponse.json({
          ok: true,
          tool,
          result: fallbackRecommendation(context),
          fallback: true,
          message:
            error instanceof Error ? error.message : "Gemini unavailable",
        });
      }
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "MCP tool call failed",
      },
      { status: 500 },
    );
  }
}

async function dispatchLocalTool(tool: MCPToolName, rawArgs: unknown) {
  if (tool === "get_weather") {
    const args = rawArgs as { lat?: unknown; lon?: unknown };
    const lat = Number(args?.lat);
    const lon = Number(args?.lon);
    return getWeather(lat, lon);
  }

  return synthesizeRecommendation(rawArgs as MCPRecommendContext);
}

async function proxyToGateway(
  gatewayUrl: string,
  tool: MCPToolName,
  args: unknown,
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
              ? payload.message
              : `MCP gateway error (${response.status})`,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, tool, result: payload });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to reach MCP gateway",
      },
      { status: 502 },
    );
  }
}
