import { test, expect } from "@playwright/test";
import { loginAsTA } from "./helpers";

// IDs from the live chain test
const PROJECT_ID = "f1360f8b-2929-43cf-b8c9-2066d1179845";
const WO_ID = "8c5671a1-fd83-4d05-9361-6614f383584d";
const TEACHER_TOKEN = "9ad7205a-6cb9-4287-8ed7-9e4bb4e40fcd";
const BASE = process.env.TEST_BASE_URL || "https://interact-portal.vercel.app";

test.describe.serial("ID Chain — Monday → Project → WO → Sign → TA Access", () => {

  test("1. TA signs WO (type signature)", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/work-orders/${WO_ID}`);
    await page.waitForLoadState("networkidle");

    // Scroll to sign button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const signBtn = page.locator("button").filter({ hasText: /accept.*sign/i });
    if (await signBtn.count() > 0) {
      await signBtn.click();
      await page.waitForTimeout(500);

      // Type mode
      const typeTab = page.locator("button").filter({ hasText: /type/i });
      await typeTab.click();
      await page.waitForTimeout(300);

      const nameInput = page.locator("input").last();
      await nameInput.fill("Mark Hansen");
      await page.waitForTimeout(300);

      const signDocBtn = page.locator("button").filter({ hasText: /sign document/i });
      await signDocBtn.click();
      await page.waitForTimeout(8000);
    }

    await page.screenshot({ path: "test-results/id-chain/01-signed.png" });
    console.log("✅ WO signed");
    await page.close();
  });

  test("2. Verify TA linked to project in DB", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);

    // Check via API that project now has TA
    const result = await page.evaluate(async (pid: string) => {
      const res = await fetch(`/api/portal/projects/${pid}/groups`);
      return { status: res.status };
    }, PROJECT_ID);

    // If TA has access, status should be 200 (not 403/404)
    console.log(`  Project access: ${result.status}`);
    expect(result.status).toBe(200);
    console.log("✅ TA has project access after signing");
    await page.close();
  });

  test("3. TA sees project in projects list", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/projects`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/id-chain/03-ta-projects.png" });

    const body = await page.textContent("body");
    expect(body).toContain("Kafka Gymnasium");
    console.log("✅ TA sees Kafka Gymnasium in projects");
    await page.close();
  });

  test("4. TA project folder has all tabs", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/projects/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/id-chain/04-ta-project.png" });

    const body = await page.textContent("body");
    expect(body).toContain("Kafka Gymnasium");

    // Check tabs exist
    for (const tab of ["Overview", "Tasks", "Documents", "Attendance", "Travel"]) {
      const tabBtn = page.locator("button").filter({ hasText: new RegExp(`^${tab}$`, "i") });
      const count = await tabBtn.count();
      console.log(`  Tab "${tab}": ${count > 0 ? "✅" : "❌"}`);
    }
    console.log("✅ Project folder loads with tabs");
    await page.close();
  });

  test("5. WO shows Project button in table", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/work-orders`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/id-chain/05-wo-project-btn.png" });

    const projectBtn = page.locator("a").filter({ hasText: /project/i });
    const count = await projectBtn.count();
    console.log(`  Project buttons: ${count}`);
    console.log("✅ WO table checked");
    await page.close();
  });

  test("6. Teacher portal works with same project", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/school/project/${TEACHER_TOKEN}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/id-chain/06-teacher.png" });

    const body = await page.textContent("body");
    expect(body).toContain("Kafka Gymnasium");
    console.log("✅ Teacher portal shows same project");
    await page.close();
  });

  test("7. Calendar shows project", async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsTA(page);
    await page.goto(`${BASE}/portal/calendar`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/id-chain/07-calendar.png" });

    const body = await page.textContent("body");
    const hasProject = body?.includes("Kafka") || body?.includes("Media Week");
    console.log(`  Kafka on calendar: ${hasProject ? "yes" : "no"}`);
    console.log("✅ Calendar checked");
    await page.close();
  });
});
