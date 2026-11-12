import { test, expect } from "@playwright/test";
import { loginAsTA, BASE_URL, TA_ID } from "./helpers";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

test.describe.serial("Work Order Lifecycle — Create, Send, View", () => {
  let woId: string | null = null;

  test("a) Admin creates WO via Supabase admin client", async () => {
    console.log("Creating WO via Supabase admin client...");
    const supabase = adminSupabase();

    const { data, error } = await supabase
      .from("work_orders")
      .insert({
        ta_id: TA_ID,
        project_name: "E2E Lifecycle Test Project",
        school: "Lifecycle Test School",
        school_address: "Test Street 1, 10115 Berlin",
        school_state: "Berlin",
        location: "Berlin",
        grade: "Grade 7",
        program_type: "Film Week",
        start_date: "2027-03-01",
        end_date: "2027-03-05",
        days: 5,
        daily_rate: 200,
        total: 1000,
        co_taught: false,
        accommodation: "none",
        sign_by: "2027-02-15",
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create WO:", error.message);
    }
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    woId = data!.id;
    console.log(`Created WO: ${woId}`);
  });

  test("b) Admin sends WO (sets status to sent)", async () => {
    test.skip(!woId, "No work order was created in previous step");
    console.log("Sending WO via Supabase admin client...");
    const supabase = adminSupabase();

    const { error } = await supabase
      .from("work_orders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", woId!);

    if (error) console.error("Failed to send WO:", error.message);
    expect(error).toBeNull();
    console.log(`WO ${woId} marked as sent`);
  });

  test("c) TA logs in — sees the new unsigned WO in their list", async ({ page }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking TA sees unsigned WO...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders`);
    await page.waitForLoadState("networkidle");

    const bodyText = await page.textContent("body");
    expect(bodyText?.includes("E2E Lifecycle Test Project")).toBeTruthy();
    await page.screenshot({ path: "test-results/lifecycle-ta-sees-wo.png" });
    console.log("TA sees WO in list");
  });

  test("d) TA views WO — sees work order details and action buttons", async ({ page }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking TA views WO detail...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text="WORK ORDER"')).toBeVisible();
    await expect(page.locator('text="Project Details"')).toBeVisible();
    await expect(page.locator('text="Lifecycle Test School"')).toBeVisible();
    await expect(page.locator('button:has-text("Accept & Sign")')).toBeVisible();
    await expect(page.locator('button:has-text("Decline")')).toBeVisible();

    await page.screenshot({ path: "test-results/lifecycle-wo-detail.png" });
    console.log("TA sees WO detail with Accept & Sign and Decline buttons");
  });

  test("e) Sign UI — signature pad appears with Draw/Type tabs", async ({ page }) => {
    test.skip(!woId, "No work order was created");
    console.log("Checking sign UI...");

    await loginAsTA(page);
    await page.goto(`${BASE_URL}/portal/work-orders/${woId}`);
    await page.waitForLoadState("networkidle");

    await page.click('button:has-text("Accept & Sign")');
    await page.waitForTimeout(500);

    await expect(page.locator('button:has-text("Draw")')).toBeVisible();
    await expect(page.locator('button:has-text("Type")')).toBeVisible();

    const canvas = page.locator("canvas");
    expect(await canvas.count()).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/lifecycle-sign-ui.png" });
    console.log("Sign UI loaded with Draw/Type tabs and canvas");

    // Cleanup
    const supabase = adminSupabase();
    await supabase.from("work_orders").delete().eq("id", woId!);
    console.log("Cleanup: test WO deleted");
  });
});
