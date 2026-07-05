import { createWorkflowItem } from "./domain.js";

const fixedNow = new Date("2026-07-05T10:00:00.000Z");

export const workflowItems = [
  createWorkflowItem(
    {
      id: "task-101",
      title: "Add API validation for workflow item creation",
      owner: "Uzair",
      status: "review",
      severity: "medium",
      dueDate: "2026-07-08",
      securitySensitive: true,
      tags: ["api", "validation"]
    },
    fixedNow
  ),
  createWorkflowItem(
    {
      id: "task-102",
      title: "Resolve blocked release checklist dependency",
      owner: "Uzair",
      status: "blocked",
      severity: "high",
      dueDate: "2026-07-06",
      securitySensitive: false,
      tags: ["release", "delivery"]
    },
    fixedNow
  ),
  createWorkflowItem(
    {
      id: "task-103",
      title: "Document environment variable handling",
      owner: "Uzair",
      status: "done",
      severity: "low",
      dueDate: "2026-07-04",
      securitySensitive: true,
      tags: ["docs", "security"]
    },
    fixedNow
  )
];
