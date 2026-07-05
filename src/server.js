import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";
import { createWorkflowItem, filterItems, summarizeRelease, ValidationError } from "./domain.js";
import { workflowItems } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const items = [...workflowItems];
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const routes = {
  "GET /health": () => ok({ status: "ok", service: "securetaskops-workflow-platform" }),
  "GET /api/health": () => ok({ status: "ok", service: "securetaskops-workflow-platform" }),
  "GET /api/tasks": ({ url }) => {
    const filters = Object.fromEntries(url.searchParams.entries());
    return ok({ data: filterItems(items, filters), count: filterItems(items, filters).length });
  },
  "GET /api/release-readiness": () => ok({ data: summarizeRelease(items) }),
  "POST /api/tasks": async ({ request }) => {
    const body = await readJson(request);
    const item = createWorkflowItem(body);
    items.push(item);
    return created({ data: item });
  }
};

export default async function handler(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const routeKey = `${request.method} ${url.pathname}`;

  try {
    if (request.method === "GET" && isStaticPath(url.pathname)) {
      return serveStatic(response, url.pathname);
    }

    const handler = routes[routeKey];
    const result = handler ? await handler({ request, url }) : notFound();
    send(response, result.statusCode, result.body);
  } catch (error) {
    const statusCode = error instanceof ValidationError ? error.statusCode : 500;
    send(response, statusCode, {
      error: error.name || "Error",
      message: statusCode === 500 ? "Unexpected server error." : error.message
    });
  }
}

export const server = createServer(handler);

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`SecureTaskOps API running on http://localhost:${port}`);
  });
}

function ok(body) {
  return { statusCode: 200, body };
}

function created(body) {
  return { statusCode: 201, body };
}

function notFound() {
  return { statusCode: 404, body: { error: "NotFound", message: "Route not found." } };
}

function send(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

async function serveStatic(response, pathname) {
  const fileName = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = join(root, "public", fileName);
  const contents = await readFile(filePath);
  response.writeHead(200, {
    "content-type": contentType(fileName),
    "cache-control": fileName.endsWith(".html") ? "no-store" : "public, max-age=3600"
  });
  response.end(contents);
}

function isStaticPath(pathname) {
  return pathname === "/" || pathname === "/app.css" || pathname === "/app.js";
}

function contentType(fileName) {
  if (fileName.endsWith(".css")) return "text/css; charset=utf-8";
  if (fileName.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "text/html; charset=utf-8";
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }
}
