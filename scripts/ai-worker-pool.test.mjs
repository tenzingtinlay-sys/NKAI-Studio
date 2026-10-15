import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkerPool, orderWorkersForTimeSlot, workerEndpoint } from "../server/utils/ai-worker-pool.mjs";

const worker = (id, leaseHours, extra = {}) => ({
  id, platform: "lightning-ai", baseUrl: "https://worker.example.test", leaseHours,
  liveServingAllowed: true, ...extra,
});

test("pool requires explicit live-serving opt-in and excludes notebook-only providers", () => {
  const pool = parseWorkerPool({ AI_WORKER_POOL_JSON: JSON.stringify([
    worker("lightning", 4),
    worker("colab", 12, { platform: "google-colab" }),
    worker("kaggle", 12, { platform: "kaggle" }),
    worker("not-approved", 4, { liveServingAllowed: false }),
  ]) });
  assert.deepEqual(pool.map((item) => item.id), ["lightning"]);
});

test("invalid URLs, embedded URL credentials, and invalid leases are excluded", () => {
  const pool = parseWorkerPool({ AI_WORKER_POOL_JSON: JSON.stringify([
    worker("bad-url", 4, { baseUrl: "not a url" }),
    worker("embedded-secret", 4, { baseUrl: "https://user:pass@worker.example.test" }),
    worker("bad-lease", 0),
  ]) });
  assert.deepEqual(pool, []);
});

test("time slot rotates predictably using provider lease durations", () => {
  const pool = [worker("lightning", 4), worker("secondary", 2)];
  assert.equal(orderWorkersForTimeSlot(pool, 0)[0].id, "lightning");
  assert.equal(orderWorkersForTimeSlot(pool, 4 * 60 * 60 * 1000)[0].id, "secondary");
  assert.equal(orderWorkersForTimeSlot(pool, 6 * 60 * 60 * 1000)[0].id, "lightning");
});

test("legacy single-worker configuration remains supported", () => {
  const pool = parseWorkerPool({ AI_WORKER_INTERNAL_URL: "http://127.0.0.1:8000", AI_WORKER_API_TOKEN: "secret" });
  assert.equal(pool.length, 1);
  assert.equal(pool[0].token, "secret");
});

test("worker endpoint joins base URL and route", () => {
  assert.equal(workerEndpoint(worker("a", 4), "health"), "https://worker.example.test/health");
});
