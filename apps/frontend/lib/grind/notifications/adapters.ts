import "server-only";

import { env } from "@/lib/grind/config/env";
import type { NotificationPayload } from "../contracts";

export type EmailSendResult = {
  simulated: boolean;
  provider: "demo" | "resend";
  providerMessageId?: string;
};

export interface EmailAdapter {
  send(notification: NotificationPayload, recipientEmail: string): Promise<EmailSendResult>;
}

export class DemoEmailAdapter implements EmailAdapter {
  async send(): Promise<EmailSendResult> {
    return {
      simulated: true,
      provider: "demo",
    };
  }
}

export class ResendEmailAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  async send(notification: NotificationPayload, recipientEmail: string): Promise<EmailSendResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [recipientEmail],
        subject: notification.subject,
        text: `${notification.preview}\n\n${notification.body}`.trim(),
        html: buildHtmlBody(notification),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend send failed (${response.status}): ${errorBody}`);
    }

    const payload = (await response.json()) as { id?: string };
    return {
      simulated: false,
      provider: "resend",
      providerMessageId: payload.id,
    };
  }
}

function buildHtmlBody(notification: NotificationPayload): string {
  const subject = escapeHtml(notification.subject);
  const preview = escapeHtml(notification.preview);
  const body = escapeHtml(notification.body).replace(/\n/g, "<br/>");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 12px 0;">${subject}</h2>
      <p style="margin:0 0 16px 0;color:#4b5563;">${preview}</p>
      <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
        ${body}
      </div>
      <p style="margin-top:16px;color:#6b7280;font-size:12px;">Sent by Grind</p>
    </div>
  `;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getEmailAdapter(): EmailAdapter {
  if (env.resendApiKey && env.resendFromEmail) {
    return new ResendEmailAdapter(env.resendApiKey, env.resendFromEmail);
  }
  return new DemoEmailAdapter();
}
