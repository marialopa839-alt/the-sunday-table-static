// Lightweight event/DOM tests. Run: node tests/test_demo_ui.cjs
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");

async function run(source) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: "actual", checked: false, hidden: true, handlers: {}, children: [],
      addEventListener(name, callback) { this.handlers[name] = callback; },
      replaceChildren() { this.children = []; },
      append(child) { this.children.push(child); },
      removeAttribute(name) { delete this[name]; }
    });
    return elements.get(id);
  }
  let sent = 0;
  let response = {status: "ok", matched: true,
    checks: [{passed: true, rule: "Example rule"}], link: "/routing-demo/iphone.html"};
  let release;
  let pending = false;
  const context = {
    document: {getElementById: element, createElement: () => ({})},
    navigator: {userAgent: "test browser", platform: "test", language: "en", maxTouchPoints: 0},
    AbortController: class { constructor() { this.signal = {}; } abort() {} },
    setTimeout: () => 1, clearTimeout: () => {},
    fetch: async (url, options) => {
      sent++;
      assert.equal(url, "/api/routing-demo");
      assert.equal(options.credentials, "omit");
      assert.equal(options.redirect, "error");
      assert.equal(Object.keys(JSON.parse(options.body)).length, 4);
      if (pending) await new Promise(resolve => { release = resolve; });
      return {ok: true, headers: {get: () => "application/json"}, json: async () => response};
    }
  };
  vm.runInNewContext(source, context, {timeout: 1000});
  const trigger = (id, event) => element(id).handlers[event]();
  assert.equal(sent, 0);
  trigger("inspect", "click");
  assert.equal(sent, 0);
  await trigger("evaluate", "click");
  assert.equal(sent, 0, "No submission without consent");
  element("consent").checked = true;
  trigger("consent", "change");
  await trigger("evaluate", "click");
  assert.equal(sent, 1);
  assert.equal(element("continue").href, "/routing-demo/iphone.html");
  assert.equal(element("continue").hidden, false);

  element("mode").value = "iphone";
  trigger("mode", "change");
  assert.equal(element("continue").hidden, true);
  trigger("inspect", "click");
  assert.match(element("source").textContent, /SIMULATED/);
  assert.equal(JSON.parse(element("details").textContent).platform, "iPhone");

  response = {...response, link: "https://example.com"};
  await trigger("evaluate", "click");
  assert.equal(element("continue").hidden, true, "External destination must be blocked");
  assert.match(element("status").textContent, /Navigation blocked/);

  response = {...response, link: "/routing-demo/iphone.html"};
  pending = true;
  const work = trigger("evaluate", "click");
  element("consent").checked = false;
  trigger("consent", "change");
  release();
  await work;
  assert.equal(element("continue").hidden, true, "Ignore stale response after revocation");
  assert.equal(element("evaluate").disabled, true);
  return "UI event tests passed: consent, local inspection, fixtures, destination allowlist, stale responses.";
}

if (require.main === module) {
  run(fs.readFileSync(path.join(__dirname, "../routing-demo/demo.js"), "utf8"))
    .then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = run;
