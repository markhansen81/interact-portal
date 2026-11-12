import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsTA, BASE_URL, TA_ID } from "./helpers";

test.describe.serial("Decline Flow", () => {
  let woId: string | null = null;

  test("a) Admin creates and sends WO via API", async ({ page }) => {
    console.log("Checking admin creates and sends WO...");
    await loginAsAdmin(page);

    // Create work order via API
    const createResult = await page.evaluate(async (taId: string) => {
      const res = await fetch("/api/admin/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ta_id: taId,
          project_name: "E2E Decline Test Project",
          school: "Decline Test School",
          school_address: "Test Street 2, 10115 Berlin",
          school_state: "Berlin",
          location: "Berlin",
          grade: "Grade 8",
          program_type: "Theatre Week",
          start_date: "2027-04-01",
          end_date: "2027-04-05",
          days: 5,
          daily_rate: 200,
          total: 1000,
          co_taught: false,
          accommodation: "none",
          sign_by: "2027-03-15",
        }),
      });
      const text = await res.text();
      try {
        return { status: res.status, data: JSON.parse(text) };
      } catch {
        return { status: res.status, data: text };
      }
    }, TA_ID);

    console.log(
      `API response: status=${createResult.status}, data=${JSON.stringify(createResult.data).slice(0, 200)}`
    );
    expect(
      createResult.status === 200 || createResult.status === 201
    ).toBeTruthy();
    woId =
      createResult.data?.workOrder?.id ||
      createResult.data?.id ||
      createResult.data?.data?.[0]?.id;
    expect(woId).toBeTruthy();
    console.log(`WO created: ${woId}`);

    // Send work order
    const sendResult = await page.evaluate(async (id: string) => {
      const res = await fetch(`/api/admin/work-orders/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      try {
        return { status: res.status, data: JSON.parse(text) };
      } catch {
        return { status: res.status, data: text };
      }
    }, woId!);

    expect(
      sendResult.status === 200 || sendResult.status === 201
    ).toBeTruthy();
    await page.screenshot({ path: "test-results/decline-wo-created.png" });
    console.log(`WO sent: ${woId}`);
  });

  test("b) TA logs in and navigates to the WO", async ({ page }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking TA navigates to WO...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text="WORK ORDER"')).toBeVisible();
    await expect(
      page.locator('text="Decline Test School"')
    ).toBeVisible();
    await page.screenshot({ path: "test-results/decline-ta-views-wo.png" });
    console.log("TA navigated to WO successfully");
  });

  test("c) TA clicks Decline — modal appears with two radio options", async ({
    page,
  }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking decline modal...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    const declineButton = page.locator('button:has-text("Decline")');
    await expect(declineButton).toBeVisible();
    await declineButton.click();

    await expect(
      page.locator('text="Decline Work Order"')
    ).toBeVisible();
    await expect(
      page.locator('text=/Please select a reason/')
    ).toBeVisible();
    await page.screenshot({ path: "test-results/decline-modal.png" });
    console.log("Decline modal appeared with radio options");
  });

  test("d) Confirm disabled without selection — Confirm Decline button is disabled", async ({
    page,
  }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking Confirm Decline is disabled without selection...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Decline")');
    await page.waitForTimeout(500);

    const confirmButton = page.locator('button:has-text("Confirm Decline")');
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeDisabled();
    await page.screenshot({
      path: "test-results/decline-confirm-disabled.png",
    });
    console.log("Confirm Decline button is disabled without selection");
  });

  test('e) Select reason — click "I would prefer not to go", comment textarea appears', async ({
    page,
  }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking decline reason selection...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Decline")');
    await page.waitForTimeout(500);

    // Click "prefer not" radio option
    const preferNotRadio = page.locator('input[value="prefer_not"]');
    await expect(preferNotRadio).toBeVisible();
    await preferNotRadio.click();
    await page.waitForTimeout(300);

    // Comment textarea should appear
    await expect(page.locator("textarea")).toBeVisible();

    // Confirm button should now be enabled
    const confirmButton = page.locator('button:has-text("Confirm Decline")');
    await expect(confirmButton).toBeEnabled();

    await page.screenshot({
      path: "test-results/decline-reason-selected.png",
    });
    console.log("Decline reason selected, textarea visible, confirm enabled");
  });

  test("f) Submit decline — click Confirm Decline, redirects to work orders list", async ({
    page,
  }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking decline submission...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Decline")');
    await page.waitForTimeout(500);

    await page.click('input[value="not_available"]');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Confirm Decline")');

    await page.waitForURL("**/portal/work-orders", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/decline-confirmed.png" });
    console.log("Decline submitted, redirected to work orders list");
  });

  test("g) WO shows as declined — the declined filter tab shows the WO", async ({
    page,
  }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking WO shows as declined...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    // Filter to declined
    const filterBar = page.locator(".flex.gap-1");
    await filterBar.getByRole("button", { name: /^Declined/ }).click();
    await page.waitForTimeout(500);

    const bodyText = await page.textContent("body");
    expect(bodyText?.includes("E2E Decline Test Project")).toBeTruthy();
    await page.screenshot({ path: "test-results/decline-in-list.png" });
    console.log("WO shows as declined in filtered list");

    // Cleanup: delete the test work order
    const adminPage = await page.context().newPage();
    await loginAsAdmin(adminPage);
    await adminPage.evaluate(async (id: string) => {
      await fetch(`/api/admin/work-orders/${id}`, { method: "DELETE" });
    }, woId!);
    await adminPage.close();
    console.log("Cleanup: test WO deleted");
  });
});
