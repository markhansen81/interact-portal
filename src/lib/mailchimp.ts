export async function addToMailchimp(data: {
  email: string;
  first_name?: string;
  last_name?: string;
  school_name?: string;
  state?: string;
}) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!apiKey || !listId) {
    console.warn("[MAILCHIMP] No API key or list ID configured, skipping");
    return null;
  }

  // Extract data center from API key (e.g. "us6")
  const dc = apiKey.split("-").pop();

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: data.email,
          status: "subscribed",
          merge_fields: {
            FNAME: data.first_name || "",
            LNAME: data.last_name || "",
          },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      // "Member Exists" is not an error — they're already subscribed
      if (error.title === "Member Exists") {
        console.log("[MAILCHIMP] Already subscribed:", data.email);
        return { already_subscribed: true };
      }
      console.error("[MAILCHIMP] Failed:", error.title, error.detail);
      return null;
    }

    const result = await res.json();
    console.log("[MAILCHIMP] Subscribed:", data.email);
    return result;
  } catch (err) {
    console.error("[MAILCHIMP] Error:", err);
    return null;
  }
}
