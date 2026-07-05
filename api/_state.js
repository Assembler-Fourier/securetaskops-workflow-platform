import { createWorkflowItem, filterItems, summarizeRelease } from "../src/domain.js";
import { workflowItems } from "../src/sample-data.js";

const globalKey = "__securetaskops_state__";

const state = globalThis[globalKey] || {
  items: [...workflowItems]
};

globalThis[globalKey] = state;

export function listItems(filters = {}) {
  return filterItems(state.items, filters);
}

export function allItems() {
  return state.items;
}

export function addItem(input) {
  const item = createWorkflowItem(input);
  state.items = [item, ...state.items];
  return item;
}

export function releaseReadiness() {
  return summarizeRelease(state.items);
}
