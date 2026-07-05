const statusFilter = document.querySelector("#statusFilter");
const severityFilter = document.querySelector("#severityFilter");
const taskGrid = document.querySelector("#taskGrid");
const summaryCards = document.querySelector("#summaryCards");
const taskForm = document.querySelector("#taskForm");
const formStatus = document.querySelector("#formStatus");
const dateInput = taskForm.elements.dueDate;

dateInput.value = nextDate(3);

statusFilter.addEventListener("change", loadDashboard);
severityFilter.addEventListener("change", loadDashboard);
taskForm.addEventListener("submit", createTask);

loadDashboard();

async function loadDashboard() {
  const params = new URLSearchParams();
  if (statusFilter.value) params.set("status", statusFilter.value);
  if (severityFilter.value) params.set("severity", severityFilter.value);

  taskGrid.innerHTML = `<article class="empty">Loading workflow items...</article>`;

  try {
    const [tasksResponse, summaryResponse] = await Promise.all([
      fetch(`/api/tasks?${params.toString()}`),
      fetch("/api/release-readiness")
    ]);

    if (!tasksResponse.ok || !summaryResponse.ok) throw new Error("Dashboard API request failed.");

    const tasks = await tasksResponse.json();
    const summary = await summaryResponse.json();

    renderSummary(summary.data);
    renderTasks(tasks.data);
  } catch (error) {
    taskGrid.innerHTML = `<article class="empty error">${escapeHtml(error.message)}</article>`;
  }
}

async function createTask(event) {
  event.preventDefault();
  formStatus.textContent = "Creating workflow item...";

  const data = new FormData(taskForm);
  const payload = {
    title: data.get("title"),
    owner: data.get("owner"),
    status: data.get("status"),
    severity: data.get("severity"),
    dueDate: data.get("dueDate"),
    securitySensitive: data.get("securitySensitive") === "on",
    tags: String(data.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };

  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Could not create workflow item.");

    formStatus.textContent = "Workflow item created and risk-scored.";
    taskForm.elements.title.value = "";
    await loadDashboard();
  } catch (error) {
    formStatus.textContent = error.message;
  }
}

function renderSummary(summary) {
  document.querySelector("#releaseStatus").textContent = formatStatus(summary.releaseStatus);
  document.querySelector("#averageRisk").textContent = summary.averageRisk;
  document.querySelector("#blockedCount").textContent = summary.blocked;
  document.querySelector("#highRiskCount").textContent = summary.highRisk;

  const cards = [
    ["Total items", summary.total],
    ["Open work", summary.open],
    ["Security-sensitive", summary.securitySensitive],
    ["Release status", formatStatus(summary.releaseStatus)]
  ];

  summaryCards.innerHTML = cards
    .map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderTasks(tasks) {
  if (!tasks.length) {
    taskGrid.innerHTML = `<article class="empty">No workflow items match the current filters.</article>`;
    return;
  }

  taskGrid.innerHTML = tasks
    .map(
      (task) => `
        <article class="task-card">
          <div class="task-topline">
            <span class="pill ${task.riskBand}">${task.riskBand}</span>
            <span>${escapeHtml(task.status.replaceAll("_", " "))}</span>
          </div>
          <h3>${escapeHtml(task.title)}</h3>
          <dl>
            <div><dt>Owner</dt><dd>${escapeHtml(task.owner)}</dd></div>
            <div><dt>Severity</dt><dd>${escapeHtml(task.severity)}</dd></div>
            <div><dt>Due</dt><dd>${escapeHtml(task.dueDate)}</dd></div>
            <div><dt>Risk</dt><dd>${task.riskScore}/100</dd></div>
          </dl>
          <ul>
            ${task.riskReasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
          </ul>
          <div class="tags">
            ${task.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            ${task.securitySensitive ? "<span>security-sensitive</span>" : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
