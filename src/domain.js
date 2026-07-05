const severityWeights = {
  low: 10,
  medium: 32,
  high: 58,
  critical: 82
};

const allowedStatuses = new Set(["todo", "in_progress", "blocked", "review", "done"]);
const allowedSeverities = new Set(Object.keys(severityWeights));

export function createWorkflowItem(input, now = new Date()) {
  const item = normalizeInput(input);
  const risk = calculateRisk(item, now);

  return {
    id: item.id || `task-${Date.now()}`,
    title: item.title,
    owner: item.owner,
    status: item.status,
    severity: item.severity,
    securitySensitive: item.securitySensitive,
    dueDate: item.dueDate,
    tags: item.tags,
    riskScore: risk.score,
    riskBand: risk.band,
    riskReasons: risk.reasons
  };
}

export function filterItems(items, filters = {}) {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.owner && item.owner.toLowerCase() !== filters.owner.toLowerCase()) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    return true;
  });
}

export function summarizeRelease(items) {
  const total = items.length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const open = items.filter((item) => item.status !== "done").length;
  const highRisk = items.filter((item) => item.riskScore >= 70).length;
  const securitySensitive = items.filter((item) => item.securitySensitive).length;
  const averageRisk = total === 0 ? 0 : Math.round(items.reduce((sum, item) => sum + item.riskScore, 0) / total);

  return {
    total,
    open,
    blocked,
    highRisk,
    securitySensitive,
    averageRisk,
    releaseStatus: releaseStatus({ blocked, highRisk, averageRisk })
  };
}

export function calculateRisk(item, now = new Date()) {
  let score = severityWeights[item.severity];
  const reasons = [`${item.severity} severity baseline`];

  if (item.status === "blocked") {
    score += 24;
    reasons.push("blocked work increases delivery risk");
  }

  if (item.securitySensitive) {
    score += 12;
    reasons.push("security-sensitive change requires extra review");
  }

  const dueSoon = daysUntil(item.dueDate, now) <= 3;
  if (dueSoon && item.status !== "done") {
    score += 10;
    reasons.push("open item is due within three days");
  }

  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    band: riskBand(bounded),
    reasons
  };
}

function normalizeInput(input) {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const title = cleanText(input.title);
  const owner = cleanText(input.owner);
  const status = input.status || "todo";
  const severity = input.severity || "medium";
  const dueDate = input.dueDate || new Date().toISOString().slice(0, 10);

  if (!title) throw new ValidationError("title is required.");
  if (!owner) throw new ValidationError("owner is required.");
  if (!allowedStatuses.has(status)) throw new ValidationError(`status must be one of: ${[...allowedStatuses].join(", ")}.`);
  if (!allowedSeverities.has(severity)) throw new ValidationError(`severity must be one of: ${[...allowedSeverities].join(", ")}.`);
  if (Number.isNaN(Date.parse(dueDate))) throw new ValidationError("dueDate must be a valid date.");

  return {
    id: typeof input.id === "string" ? input.id : undefined,
    title,
    owner,
    status,
    severity,
    securitySensitive: Boolean(input.securitySensitive),
    dueDate,
    tags: Array.isArray(input.tags) ? input.tags.map(cleanText).filter(Boolean).slice(0, 8) : []
  };
}

function releaseStatus({ blocked, highRisk, averageRisk }) {
  if (blocked > 0 || highRisk > 1) return "needs_attention";
  if (averageRisk >= 58) return "watch";
  return "ready_for_review";
}

function riskBand(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function daysUntil(dateString, now) {
  const target = new Date(`${dateString}T00:00:00.000Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}
