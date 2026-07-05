import { addItem, listItems } from "./_state.js";
import { methodNotAllowed, readBody, sendError, sendJson } from "./_response.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url || "/api/tasks", `https://${request.headers.host || "localhost"}`);
      const filters = Object.fromEntries(url.searchParams.entries());
      const data = listItems(filters);
      return sendJson(response, 200, { data, count: data.length });
    }

    if (request.method === "POST") {
      const item = addItem(await readBody(request));
      return sendJson(response, 201, { data: item });
    }

    return methodNotAllowed(response, ["GET", "POST"]);
  } catch (error) {
    return sendError(response, error);
  }
}
