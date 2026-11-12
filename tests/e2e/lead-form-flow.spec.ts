import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers";

test.describe.serial("Lead Form Flow", () => {
  test("1. Lead form page loads with step 1 visible", async ({ page }) => {
    console.log("Checking lead form page loads...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/lead-form/);

    // Step 1 title: h2 with pink text "PROJEKTANFRAGE"
    await expect(
      page.locator("h2").filter({ hasText: /Projektanfrage/i })
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "test-results/lead-form-step1.png" });
    console.log("Lead form page loaded with step 1 visible");
  });

  test("2. Form shows DE/EN language toggle", async ({ page }) => {
    console.log("Checking language toggle...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Language toggle uses <a> tags with text "DE" and "EN"
    await expect(page.locator('a:has-text("DE")')).toBeVisible();
    await expect(page.locator('a:has-text("EN")')).toBeVisible();
    console.log("Language toggle found");

    await page.screenshot({ path: "test-results/lead-form-lang.png" });
  });

  test("3. Step 1 — contact fields are required (WEITER disabled)", async ({ page }) => {
    console.log("Checking step 1 required fields...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // The WEITER button should be disabled when fields are empty
    const nextButton = page.locator("button").filter({ hasText: /Weiter/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeDisabled();
    console.log("WEITER button is disabled when fields are empty (validation works)");

    await page.screenshot({ path: "test-results/lead-form-required.png" });
  });

  test("4. Step 1 — fill name/email, click Weiter advances to step 2", async ({
    page,
  }) => {
    console.log("Checking step 1 to step 2 advance...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // The form uses Input components with labels like "VORNAME *", "NACHNAME *", "E-MAIL-ADRESSE *"
    // Inputs are regular <input> elements inside <div> blocks with <label> siblings
    // Fill first name (first text input)
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    // Fill last name (second text input)
    await inputs.nth(1).fill("Lead");

    // Fill email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("e2e-test@test.de");

    // Click WEITER (should now be enabled)
    const nextButton = page.locator("button").filter({ hasText: /Weiter/i });
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await page.waitForTimeout(500);

    // Step 2 title should be visible: "IHRE ROLLE"
    await expect(
      page.locator("h2").filter({ hasText: /Ihre Rolle/i })
    ).toBeVisible({ timeout: 5000 });
    console.log("Advanced to step 2");

    await page.screenshot({ path: "test-results/lead-form-step2.png" });
  });

  test("5. Step 2 — role selection buttons visible", async ({ page }) => {
    console.log("Checking step 2 role selection...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Fill step 1 and advance
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 2 uses rounded-full buttons for role selection (not checkboxes)
    const roleButtons = page.locator("button.rounded-full");
    const count = await roleButtons.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} role selection buttons on step 2`);

    await page.screenshot({ path: "test-results/lead-form-roles.png" });
  });

  test("6. Step 3 — school details fields visible", async ({ page }) => {
    console.log("Checking step 3 school details...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Fill step 1
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Fill step 2: click a role button
    await page.locator("button.rounded-full").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 3 title: "IHRE SCHULE"
    await expect(
      page.locator("h2").filter({ hasText: /Ihre Schule/i })
    ).toBeVisible({ timeout: 5000 });

    // Should have label text for school name
    const schoolLabel = page.locator("label").filter({ hasText: /Schulname/i });
    await expect(schoolLabel).toBeVisible();
    console.log("School details fields visible on step 3");

    await page.screenshot({ path: "test-results/lead-form-school.png" });
  });

  test("7. Step 4 — date selection options visible", async ({ page }) => {
    console.log("Checking date selection...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Fill steps 1-3
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 2: select role
    await page.locator("button.rounded-full").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 3: fill school details
    // School name, street, postcode, city are text inputs; state is a select
    const step3Inputs = page.locator("input[type='text'], input:not([type])");
    await step3Inputs.nth(0).fill("Test Schule");
    await step3Inputs.nth(1).fill("Teststr. 1");
    await step3Inputs.nth(2).fill("10115");
    await step3Inputs.nth(3).fill("Berlin");
    // Select state
    await page.locator("select").first().selectOption("Berlin");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 4 title: "TERMINE"
    await expect(
      page.locator("h2").filter({ hasText: /Termine/i })
    ).toBeVisible({ timeout: 5000 });

    // Should show date selection buttons
    const hasDateYes = page.locator("button").filter({ hasText: /Ja, wir haben/i });
    const hasDateNo = page.locator("button").filter({ hasText: /Noch nicht sicher/i });
    await expect(hasDateYes).toBeVisible();
    await expect(hasDateNo).toBeVisible();
    console.log("Date selection options visible on step 4");

    await page.screenshot({ path: "test-results/lead-form-dates.png" });
  });

  test("8. Step 5 — program selection visible", async ({ page }) => {
    console.log("Checking program selection...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Fill steps 1-4 quickly
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    await page.locator("button.rounded-full").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    const step3Inputs = page.locator("input[type='text'], input:not([type])");
    await step3Inputs.nth(0).fill("Test Schule");
    await step3Inputs.nth(1).fill("Teststr. 1");
    await step3Inputs.nth(2).fill("10115");
    await step3Inputs.nth(3).fill("Berlin");
    await page.locator("select").first().selectOption("Berlin");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 4: skip dates
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 5 title: "IHR PROJEKT"
    await expect(
      page.locator("h2").filter({ hasText: /Ihr Projekt/i })
    ).toBeVisible({ timeout: 5000 });

    // Program buttons should be visible (bordered, full-width buttons)
    const programButtons = page.locator("button.w-full.rounded-sm");
    const count = await programButtons.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} program options on step 5`);

    await page.screenshot({ path: "test-results/lead-form-programs.png" });
  });

  test("9. Step 6 — privacy checkbox required before submit", async ({
    page,
  }) => {
    console.log("Checking privacy checkbox...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Fill steps 1-5 quickly
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    await page.locator("button.rounded-full").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    const step3Inputs = page.locator("input[type='text'], input:not([type])");
    await step3Inputs.nth(0).fill("Test Schule");
    await step3Inputs.nth(1).fill("Teststr. 1");
    await step3Inputs.nth(2).fill("10115");
    await step3Inputs.nth(3).fill("Berlin");
    await page.locator("select").first().selectOption("Berlin");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 5: select a program
    await page.locator("button.w-full.rounded-sm").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 6 title: "FAST GESCHAFFT!"
    await expect(
      page.locator("h2").filter({ hasText: /Fast geschafft/i })
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled without privacy checked
    const submitButton = page.locator("button").filter({ hasText: /Anfrage senden/i });
    await expect(submitButton).toBeDisabled();

    // Check privacy checkbox
    const privacyCheckbox = page.locator('input[type="checkbox"]').last();
    await privacyCheckbox.check();

    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled();
    console.log("Privacy checkbox required before submit -- works correctly");

    await page.screenshot({ path: "test-results/lead-form-privacy.png" });
  });

  test("10. Full form submission — fill all steps, submit, see success", async ({
    page,
  }) => {
    console.log("Checking full form submission...");
    await page.goto(`${BASE_URL}/lead-form`);
    await page.waitForLoadState("networkidle");

    // Step 1: contact info
    const inputs = page.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill("Test");
    await inputs.nth(1).fill("Lead");
    await page.locator('input[type="email"]').fill("e2e-test@test.de");
    await page.locator('input[type="tel"]').fill("+49 123 456789");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 2: select role
    await page.locator("button.rounded-full").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 3: school details
    const step3Inputs = page.locator("input[type='text'], input:not([type])");
    await step3Inputs.nth(0).fill("E2E Test Schule");
    await step3Inputs.nth(1).fill("Teststr. 1");
    await step3Inputs.nth(2).fill("10115");
    await step3Inputs.nth(3).fill("Berlin");
    await page.locator("select").first().selectOption("Berlin");
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 4: dates -- skip (WEITER still enabled)
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 5: select a program
    await page.locator("button.w-full.rounded-sm").first().click();
    await page.locator("button").filter({ hasText: /Weiter/i }).click();
    await page.waitForTimeout(500);

    // Step 6: privacy + submit
    // Check privacy checkbox (the last checkbox on step 6)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkCount = await checkboxes.count();
    // The last checkbox is the privacy one
    await checkboxes.nth(checkCount - 1).check();

    // Submit
    const submitButton = page.locator("button").filter({ hasText: /Anfrage senden/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Check for success message: "VIELEN DANK!"
    const success = page.locator("h2").filter({ hasText: /Vielen Dank/i });
    await expect(success).toBeVisible({ timeout: 10000 });
    console.log("Form submitted successfully -- success message visible");

    await page.screenshot({ path: "test-results/lead-form-submitted.png" });
  });
});
