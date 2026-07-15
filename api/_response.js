import { ValidationError } from "../src/domain.js";

export function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.end(JSON.stringify(body, null, 2));
}

export function sendError(response, error) {
  const statusCode = error instanceof ValidationError ? error.statusCode : 500;
  sendJson(response, statusCode, {
    error: error.name || "Error",
    message: statusCode === 500 ? "Unexpected server error." : error.message
  });
}

export function methodNotAllowed(response, methods) {
  response.setHeader("allow", methods.join(", "));
  sendJson(response, 405, {
    error: "MethodNotAllowed",
    message: `Use ${methods.join(" or ")} for this endpoint.`
  });
}

export async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    if (Buffer.byteLength(JSON.stringify(request.body), "utf8") > 65_536) {
      throw new ValidationError("Request body must not exceed 64 KB.");
    }
    return request.body;
  }
  if (typeof request.body === "string" && request.body.trim()) {
    if (Buffer.byteLength(request.body, "utf8") > 65_536) {
      throw new ValidationError("Request body must not exceed 64 KB.");
    }
    try {
      return JSON.parse(request.body);
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }
  }
  return {};
}
