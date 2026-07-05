import { createServer } from "node:http";
import { URL } from "node:url";
import { createWorkflowItem, filterItems, summarizeRelease, ValidationError } from "./domain.js";
import { workflowItems } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const items = [...workflowItems];

const routes = {
  "GET /health": () => ok({ status: "ok", service: "securetaskops-workflow-platform" }),
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

export const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const routeKey = `${request.method} ${url.pathname}`;

  try {
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
});

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
