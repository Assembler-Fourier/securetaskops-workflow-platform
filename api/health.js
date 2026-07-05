import { sendJson } from "./_response.js";

export default function handler(request, response) {
  sendJson(response, 200, {
    status: "ok",
    service: "securetaskops-workflow-platform",
    version: "0.2.0"
  });
}
