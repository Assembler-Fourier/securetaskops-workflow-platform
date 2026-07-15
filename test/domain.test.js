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

test("createWorkflowItem uses the supplied clock for its default due date", () => {
  const item = createWorkflowItem({ title: "Clocked item", owner: "Uzair", severity: "low" }, now);

  assert.equal(item.dueDate, "2026-07-05");
  assert.match(item.riskReasons.join(" "), /due within three days/);
});

test("createWorkflowItem rejects impossible or non-date-only due dates", () => {
  for (const dueDate of ["2026-02-30", "2026-07-05T10:00:00Z", "not-a-date"]) {
    assert.throws(
      () => createWorkflowItem({ title: "Invalid date", owner: "Uzair", dueDate }, now),
      /valid YYYY-MM-DD date/
    );
  }
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

test("calculateRisk distinguishes overdue work from the due-soon boundary", () => {
  const overdue = calculateRisk(
    { status: "todo", severity: "low", dueDate: "2026-07-04", securitySensitive: false },
    now
  );
  const dueInFourDays = calculateRisk(
    { status: "todo", severity: "low", dueDate: "2026-07-09", securitySensitive: false },
    now
  );
  const completed = calculateRisk(
    { status: "done", severity: "low", dueDate: "2026-07-04", securitySensitive: false },
    now
  );

  assert.match(overdue.reasons.join(" "), /overdue/);
  assert.equal(overdue.score, 20);
  assert.equal(dueInFourDays.score, 10);
  assert.equal(completed.score, 10);
});
