import test from "node:test";
import assert from "node:assert/strict";
import { calculateRisk, createWorkflowItem, filterItems, summarizeRelease, ValidationError } from "../src/domain.js";

const now = new Date("2026-07-05T10:00:00.000Z");

test("createWorkflowItem validates required fields", () => {
  assert.throws(
    () => createWorkflowItem({ owner: "Uzair", severity: "medium" }, now),
    ValidationError
  );
});

test("calculateRisk raises risk for blocked security-sensitive work due soon", () => {
  const item = createWorkflowItem(
    {
      title: "Review auth callback validation",
      owner: "Uzair",
      status: "blocked",
      severity: "high",
      dueDate: "2026-07-06",
      securitySensitive: true
    },
    now
  );

  assert.equal(item.riskBand, "critical");
  assert.ok(item.riskScore >= 90);
  assert.match(item.riskReasons.join(" "), /blocked/);
});

test("filterItems supports recruiter-review friendly query filters", () => {
  const items = [
    createWorkflowItem({ title: "One", owner: "Uzair", status: "todo", severity: "low" }, now),
    createWorkflowItem({ title: "Two", owner: "Aisha", status: "done", severity: "critical" }, now)
  ];

  assert.equal(filterItems(items, { owner: "uzair" }).length, 1);
  assert.equal(filterItems(items, { severity: "critical" })[0].title, "Two");
});

test("summarizeRelease flags blocked or high-risk release work", () => {
  const items = [
    createWorkflowItem({ title: "Blocked release item", owner: "Uzair", status: "blocked", severity: "high" }, now),
    createWorkflowItem({ title: "Finished docs", owner: "Uzair", status: "done", severity: "low" }, now)
  ];

  assert.deepEqual(summarizeRelease(items), {
    total: 2,
    open: 1,
    blocked: 1,
    highRisk: 1,
    securitySensitive: 0,
    averageRisk: 51,
    releaseStatus: "needs_attention"
  });
});

test("calculateRisk remains bounded", () => {
  const risk = calculateRisk(
    {
      status: "blocked",
      severity: "critical",
      dueDate: "2026-07-05",
      securitySensitive: true
    },
    now
  );

  assert.equal(risk.score, 100);
});
