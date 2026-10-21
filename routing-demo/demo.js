"use strict";
const $ = (id) => document.getElementById(id);
let input = null;
let revision = 0;
let busy = false;
const destinations = new Set(["/routing-demo/iphone.html", "/routing-demo/other.html"]);

function invalidate() {
  revision++;
  input = null;
  $("details").textContent = "No data yet.";
  $("source").textContent = "Click “Show details locally” for this selection.";
  $("response").textContent = "No server response yet.";
  $("checks").replaceChildren();
  $("status").textContent = "Waiting for a test. No automatic navigation.";
  $("continue").hidden = true;
  $("continue").removeAttribute("href");
  $("evaluate").disabled = true;
}

function collect() {
  if ($("mode").value === "iphone") {
    return {userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone", language: "en-US", maxTouchPoints: 5};
  }
  if ($("mode").value === "desktop") {
    return {userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
      platform: "Linux x86_64", language: "en-US", maxTouchPoints: 0};
  }
  return {userAgent: navigator.userAgent, platform: navigator.platform || "",
    language: navigator.language || "", maxTouchPoints: navigator.maxTouchPoints || 0};
}

$("mode").addEventListener("change", invalidate);
$("consent").addEventListener("change", () => {
  if (!$("consent").checked) invalidate();
  $("evaluate").disabled = busy || !input || !$("consent").checked;
});
$("inspect").addEventListener("click", () => {
  invalidate();
  input = collect();
  $("details").textContent = JSON.stringify(input, null, 2);
  $("source").textContent = $("mode").value === "actual"
    ? "Actual browser-reported values. Still local; nothing sent yet."
    : "SIMULATED input. These are fixtures, not detected device details.";
  $("evaluate").disabled = busy || !$("consent").checked;
});

$("evaluate").addEventListener("click", async () => {
  if (busy || !input || !$("consent").checked) return;
  const currentRevision = revision;
  busy = true;
  $("evaluate").disabled = true;
  $("continue").hidden = true;
  $("continue").removeAttribute("href");
  $("checks").replaceChildren();
  $("response").textContent = "Waiting for server…";
  $("status").textContent = "Sending only the four displayed fields to this site's server…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/api/routing-demo", {
      method: "POST", credentials: "omit", redirect: "error",
      headers: {"Content-Type": "application/json"}, body: JSON.stringify(input),
      signal: controller.signal
    });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("application/json")) {
      throw new Error("The demo endpoint is unavailable. Start python demo_server.py; static hosting alone cannot run this test.");
    }
    const result = await response.json();
    if (currentRevision !== revision) return;
    if (result.status !== "ok" || !Array.isArray(result.checks) || !destinations.has(result.link)) {
      throw new Error("Unexpected server response. Navigation blocked.");
    }
    $("response").textContent = JSON.stringify(result, null, 2);
    for (const check of result.checks) {
      const li = document.createElement("li");
      li.textContent = `${check.passed ? "PASS" : "NO MATCH"} — ${check.rule}`;
      $("checks").append(li);
    }
    $("status").textContent = result.matched
      ? "The sample iPhone Safari rules matched → page A."
      : "One or more sample rules did not match → page B. This is a normal result, not an error.";
    $("continue").href = result.link;
    $("continue").hidden = false;
  } catch (error) {
    if (currentRevision !== revision) return;
    $("status").textContent = error.name === "AbortError" ? "Request timed out. No navigation occurred." : error.message;
    $("response").textContent = "No usable decision received.";
  } finally {
    clearTimeout(timeout);
    busy = false;
    $("evaluate").disabled = !input || !$("consent").checked;
  }
});
