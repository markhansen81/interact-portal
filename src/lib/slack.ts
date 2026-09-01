export async function sendSlackMessage(webhookUrl: string, message: {
  text: string;
  blocks?: Array<Record<string, unknown>>;
}) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error("[SLACK] Failed to send:", err);
  }
}

export async function notifyNewLead(data: {
  name: string;
  email?: string;
  school?: string;
  programs?: string[];
  state?: string;
  mondayOk: boolean;
  insightlyOk: boolean;
  emailOk: boolean;
}) {
  const webhookUrl = process.env.SLACK_LEADS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const syncStatus = [];
  if (data.mondayOk) syncStatus.push("\u2705 Monday");
  else syncStatus.push("\u274c Monday FAILED");
  if (data.insightlyOk) syncStatus.push("\u2705 Insightly");
  else syncStatus.push("\u274c Insightly FAILED");
  if (data.emailOk) syncStatus.push("\u2705 Email sent");
  else syncStatus.push("\u274c Email FAILED");

  const hasFailed = !data.mondayOk || !data.insightlyOk || !data.emailOk;

  await sendSlackMessage(webhookUrl, {
    text: hasFailed
      ? `\u26a0\ufe0f Lead sync failed: ${data.name}`
      : `\ud83c\udf1f New Lead: ${data.name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: hasFailed
            ? `\u26a0\ufe0f Lead Sync Issue`
            : `\ud83c\udf1f New Lead`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Name:*\n${data.name}` },
          { type: "mrkdwn", text: `*Email:*\n${data.email || "-"}` },
          { type: "mrkdwn", text: `*School:*\n${data.school || "-"}` },
          { type: "mrkdwn", text: `*State:*\n${data.state || "-"}` },
        ],
      },
      ...(data.programs?.length ? [{
        type: "section" as const,
        text: { type: "mrkdwn" as const, text: `*Programs:* ${data.programs.join(", ")}` },
      }] : []),
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: syncStatus.join("  |  ") },
        ],
      },
    ],
  });
}
