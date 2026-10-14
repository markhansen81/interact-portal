/* ---------------------------------------------------------------------------
 * Generic alert system (uses SLACK_ALERTS_WEBHOOK_URL)
 * --------------------------------------------------------------------------- */

const SLACK_ALERTS_WEBHOOK = process.env.SLACK_ALERTS_WEBHOOK_URL;

interface SlackAlert {
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  fields?: Array<{ label: string; value: string }>;
}

const ALERT_COLORS: Record<SlackAlert["type"], string> = {
  critical: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  success: "#16a34a",
};

const ALERT_EMOJI: Record<SlackAlert["type"], string> = {
  critical: ":rotating_light:",
  warning: ":warning:",
  info: ":information_source:",
  success: ":white_check_mark:",
};

export async function sendSlackAlert(alert: SlackAlert): Promise<void> {
  if (!SLACK_ALERTS_WEBHOOK) {
    console.log(`[Slack] No alerts webhook configured — skipping: ${alert.title}`);
    return;
  }

  const fields = (alert.fields ?? []).map((f) => ({
    title: f.label,
    value: f.value,
    short: true,
  }));

  const payload = {
    attachments: [
      {
        color: ALERT_COLORS[alert.type],
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${ALERT_EMOJI[alert.type]} *${alert.title}*\n${alert.message}`,
            },
          },
        ],
        fields: fields.length > 0 ? fields : undefined,
        footer: "InterACT Portal Monitoring",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(SLACK_ALERTS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[Slack] Alerts webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[Slack] Failed to send alert:", err);
  }
}

/* ---------------------------------------------------------------------------
 * Low-level webhook sender (for domain-specific webhooks)
 * --------------------------------------------------------------------------- */

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

export async function notifyWorkOrderEvent(data: {
  event: "signed" | "declined" | "sent" | "cancelled";
  taName: string;
  projectName: string;
  school: string;
  reason?: string;
}) {
  const webhookUrl = process.env.SLACK_WORKORDERS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const emojiMap: Record<string, string> = {
    signed: "\u2705",
    declined: "\u274c",
    sent: "\ud83d\udce8",
    cancelled: "\ud83d\udeab",
  };

  const labelMap: Record<string, string> = {
    signed: "Signed",
    declined: "Declined",
    sent: "Sent",
    cancelled: "Cancelled",
  };

  const emoji = emojiMap[data.event];
  const label = labelMap[data.event];

  const fields = [
    { type: "mrkdwn" as const, text: `*TA:*\n${data.taName}` },
    { type: "mrkdwn" as const, text: `*Project:*\n${data.projectName}` },
    { type: "mrkdwn" as const, text: `*School:*\n${data.school}` },
  ];

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} Work Order ${label}`,
      },
    },
    {
      type: "section",
      fields,
    },
  ];

  if (data.reason) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Reason:* ${data.reason}` },
    });
  }

  await sendSlackMessage(webhookUrl, {
    text: `${emoji} Work Order ${label}: ${data.taName} — ${data.projectName}`,
    blocks,
  });
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
