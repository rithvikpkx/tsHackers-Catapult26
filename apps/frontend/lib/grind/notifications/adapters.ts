import type { NotificationPayload } from "../contracts";

export interface EmailAdapter {
  send(notification: NotificationPayload): Promise<{ simulated: boolean }>;
}

export class DemoEmailAdapter implements EmailAdapter {
  async send(): Promise<{ simulated: true }> {
    return { simulated: true };
  }
}
