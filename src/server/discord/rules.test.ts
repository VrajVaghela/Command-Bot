import { test } from "node:test";
import assert from "node:assert/strict";

import { applyReportTemplate, defaultRule } from "./rules";

test("applyReportTemplate: substitutes the {message} placeholder", () => {
  const rule = { ...defaultRule, responseTemplate: "Got it: {message}" };
  assert.equal(
    applyReportTemplate(rule, "the API is down"),
    "Got it: the API is down",
  );
});

test("applyReportTemplate: substitutes every occurrence of {message}", () => {
  const rule = { ...defaultRule, responseTemplate: "{message} / {message}" };
  assert.equal(applyReportTemplate(rule, "x"), "x / x");
});

test("applyReportTemplate: falls back to the default template when unset", () => {
  const rule = { ...defaultRule, responseTemplate: undefined };
  assert.equal(
    applyReportTemplate(rule, "the API is down"),
    "📩 Report received: the API is down",
  );
});
