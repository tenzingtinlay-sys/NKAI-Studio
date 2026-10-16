import { chromium } from "playwright";

const pageUrl = process.env.NKAI_AVATAR_PAGE_URL;
const cookiePair = process.env.NKAI_SESSION_COOKIE;
const testPhrase = process.env.NKAI_LIVETALKING_TEST_TEXT || "Hello. This is a live avatar speech test.";
if (!pageUrl || !cookiePair || !cookiePair.includes("=")) {
  console.error("Set NKAI_AVATAR_PAGE_URL and NKAI_SESSION_COOKIE='cookieName=cookieValue'. Do not paste the cookie into logs or commit it.");
  process.exit(2);
}

const target = new URL(pageUrl);
const [cookieName, ...cookieValueParts] = cookiePair.split("=");
const cookieValue = cookieValueParts.join("=");
if (!cookieName || !cookieValue) {
  console.error("NKAI_SESSION_COOKIE must be a non-empty name=value pair.");
  process.exit(2);
}

const failures = [];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ permissions: ["autoplay"] });
  await context.addCookies([{
    name: cookieName.trim(),
    value: cookieValue,
    domain: target.hostname,
    path: "/",
    httpOnly: false,
    secure: target.protocol === "https:",
    sameSite: "Lax",
  }]);
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push("page error: " + error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push("console error: " + message.text());
  });
  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByRole("button", { name: "Check service" }).click({ timeout: 15000 });
  await page.getByText(/HTTP service: reachable/).waitFor({ timeout: 10000 });
  console.log("PASS: authenticated LiveTalking HTTP endpoint is reachable.");

  await page.getByRole("button", { name: "Connect live avatar" }).click({ timeout: 15000 });
  await page.getByText("Live WebRTC stream connected", { exact: true }).waitFor({ timeout: 45000 });
  const media = await page.locator("video").evaluate((video) => {
    const stream = video.srcObject;
    return {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      readyState: video.readyState,
      tracks: stream instanceof MediaStream ? stream.getTracks().map((track) => ({ kind: track.kind, state: track.readyState })) : [],
    };
  });
  const hasVideo = media.videoWidth > 0 && media.videoHeight > 0 && media.tracks.some((track) => track.kind === "video" && track.state === "live");
  const hasAudio = media.tracks.some((track) => track.kind === "audio" && track.state === "live");
  if (!hasVideo || !hasAudio) throw new Error("WebRTC connected but live audio/video tracks were not both verified: " + JSON.stringify(media));
  console.log("PASS: live video dimensions " + media.videoWidth + "x" + media.videoHeight + " and live audio track verified.");

  await page.getByRole("textbox", { name: "Text for live avatar" }).fill(testPhrase);
  await page.getByRole("button", { name: "Speak", exact: true }).click();
  await page.getByText("Text sent to the live avatar", { exact: true }).waitFor({ timeout: 15000 });
  console.log("PASS: text command accepted by LiveTalking.");

  await page.getByRole("button", { name: "Interrupt speech" }).click();
  await page.getByText("Speech interrupted", { exact: true }).waitFor({ timeout: 10000 });
  console.log("PASS: interrupt command accepted.");
  if (failures.length) {
    console.error("Browser console/page errors observed:");
    for (const failure of failures) console.error("- " + failure);
    process.exitCode = 1;
  } else {
    console.log("PASS: no browser console or page errors observed.");
  }
} catch (error) {
  console.error("FAIL: LiveTalking acceptance test: " + (error instanceof Error ? error.message : String(error)));
  if (failures.length) console.error("Browser diagnostics: " + failures.join(" | "));
  process.exitCode = 1;
} finally {
  await browser.close();
}
