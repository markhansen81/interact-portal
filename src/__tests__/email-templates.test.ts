/**
 * Tests for renderVars in src/lib/email-templates.ts
 *
 * Covers: HTML escaping of text variables, trusted HTML fragment pass-through,
 * and missing variable handling.
 */
import { describe, it, expect } from "vitest";
import { renderVars } from "@/lib/email-templates";

describe("renderVars — HTML escaping", () => {
  it("escapes < and > in text variables", () => {
    const result = renderVars("Hello {{NAME}}", { NAME: "<script>alert(1)</script>" });
    expect(result).toBe("Hello &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("escapes & in text variables", () => {
    const result = renderVars("{{SCHOOL}}", { SCHOOL: "Schulze & Partner GmbH" });
    expect(result).toBe("Schulze &amp; Partner GmbH");
  });

  it("escapes double quotes in text variables", () => {
    const result = renderVars('href="{{URL}}"', { URL: 'x" onclick="alert(1)' });
    expect(result).toBe('href="x&quot; onclick=&quot;alert(1)"');
  });

  it("escapes single quotes in text variables", () => {
    const result = renderVars("{{MSG}}", { MSG: "it's here" });
    expect(result).toBe("it&#039;s here");
  });

  it("substitutes multiple different variables", () => {
    const result = renderVars("{{A}} + {{B}}", { A: "foo", B: "bar" });
    expect(result).toBe("foo + bar");
  });

  it("renders empty string for missing variables", () => {
    const result = renderVars("Hello {{MISSING}}", {});
    expect(result).toBe("Hello ");
  });

  it("does not escape the trusted LEAD_TABLE variable", () => {
    const html = "<table><tr><td>School</td></tr></table>";
    const result = renderVars("{{LEAD_TABLE}}", { LEAD_TABLE: html });
    expect(result).toBe(html);
    expect(result).toContain("<table>");
  });

  it("escapes HTML in variable values but not in the template itself", () => {
    // renderVars escapes values substituted into {{VAR}} placeholders,
    // not literal HTML already in the template.
    const result = renderVars("<p>{{TA_NAME}}</p>", { TA_NAME: "<b>Bold</b>" });
    expect(result).toBe("<p>&lt;b&gt;Bold&lt;/b&gt;</p>");
    expect(result).not.toContain("<b>");
  });

  it("handles template with no placeholders unchanged", () => {
    const template = "<p>Static content</p>";
    expect(renderVars(template, {})).toBe(template);
  });
});
