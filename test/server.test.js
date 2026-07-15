import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { server } from "../src/server.js";

let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("health route returns a non-cacheable service contract", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "securetaskops-workflow-platform"
  });
});

test("task route filters deterministic sample data", async () => {
  const response = await fetch(`${baseUrl}/api/tasks?status=blocked`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.count, 1);
  assert.equal(body.data[0].status, "blocked");
});

test("task creation rejects malformed JSON without exposing a stack trace", async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{broken"
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "ValidationError");
  assert.match(body.message, /valid JSON/);
  assert.equal(JSON.stringify(body).includes("stack"), false);
});

test("task creation validates and returns a reviewable workflow item", async () => {
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Review session boundary",
      owner: "QA fixture",
      status: "review",
      severity: "medium",
      dueDate: "2030-01-01",
      securitySensitive: true
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.title, "Review session boundary");
  assert.equal(body.data.owner, "QA fixture");
  assert.equal(body.data.riskScore, 44);
  assert.deepEqual(body.data.riskReasons, [
    "medium severity baseline",
    "security-sensitive change requires extra review"
  ]);
});

test("static dashboard ships restrictive browser headers", async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(await response.text(), /SecureTaskOps/);
});
