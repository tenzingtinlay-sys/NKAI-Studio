import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkerBaseUrl } from "./smoke-ai-worker-utils.mjs";

test("accepts secure remote worker URLs", () => {
  assert.equal(validateWorkerBaseUrl("https://gpu.example.com/").origin, "https://gpu.example.com");
});

test("allows plain HTTP only for local development", () => {
  assert.equal(validateWorkerBaseUrl("http://127.0.0.1:7860").port, "7860");
  assert.throws(() => validateWorkerBaseUrl("http://gpu.example.com"), /must use HTTPS/);
});

test("rejects malformed URLs and embedded credentials", () => {
  assert.throws(() => validateWorkerBaseUrl("not a url"), /absolute URL/);
  assert.throws(() => validateWorkerBaseUrl("https://user:pass@gpu.example.com"), /embedded credentials/);
});

test("removes URL fragments", () => {
  assert.equal(validateWorkerBaseUrl("https://gpu.example.com/#secret").hash, "");
});
