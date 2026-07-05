import { methodNotAllowed, sendError, sendJson } from "./_response.js";
import { releaseReadiness } from "./_state.js";

export default function handler(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);

  try {
    return sendJson(response, 200, { data: releaseReadiness() });
  } catch (error) {
    return sendError(response, error);
  }
}
