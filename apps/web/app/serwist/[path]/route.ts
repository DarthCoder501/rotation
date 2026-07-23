import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const gitRevision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision: gitRevision }],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });
