import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/grind/config/env";
import type { NotificationPayload } from "@/lib/grind/contracts";
import { getEmailAdapter } from "@/lib/grind/notifications/adapters";
import { getSupabaseAdminClient } from "@/lib/grind/supabase/admin";

type SendNotificationRequest = {
  notificationId?: string;
  notification?: NotificationPayload;
};

type NotificationRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  intervention_id: string | null;
  channel: NotificationPayload["channel"];
  payload_json: Record<string, unknown>;
  delivery_status: NotificationPayload["deliveryStatus"];
  sent_at: string | null;
};

type UserRow = {
  id: string;
  email: string;
};

function isNotificationPayload(value: unknown): value is NotificationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<NotificationPayload>;
  return (
    typeof candidate.id === "string" &&
    (candidate.channel === "email" || candidate.channel === "voice") &&
    typeof candidate.subject === "string" &&
    typeof candidate.preview === "string" &&
    typeof candidate.body === "string" &&
    (candidate.deliveryStatus === "queued" ||
      candidate.deliveryStatus === "sent" ||
      candidate.deliveryStatus === "simulated")
  );
}

function rowToNotification(row: NotificationRow): NotificationPayload {
  return {
    id: row.id,
    channel: row.channel,
    taskId: row.task_id ?? undefined,
    interventionId: row.intervention_id ?? undefined,
    subject: typeof row.payload_json.subject === "string" ? row.payload_json.subject : "Grind alert",
    preview: typeof row.payload_json.preview === "string" ? row.payload_json.preview : "",
    body: typeof row.payload_json.body === "string" ? row.payload_json.body : "",
    deliveryStatus: row.delivery_status,
    sentAt: row.sent_at ?? undefined,
  };
}

async function lookupUserBySession() {
  const session = await auth();
  const userEmail = session?.user?.email ?? env.resendToEmail ?? "";
  if (!userEmail) {
    return { session, user: null };
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return {
      session,
      user: session?.user?.id
        ? {
            id: session.user.id,
            email: userEmail,
          }
        : null,
    };
  }

  const supabase = getSupabaseAdminClient();
  if (session?.user?.id) {
    const { data: byId } = await supabase
      .from("users")
      .select("id,email")
      .eq("id", session.user.id)
      .maybeSingle<UserRow>();
    if (byId) {
      return { session, user: byId };
    }
  }

  const { data: byEmail } = await supabase
    .from("users")
    .select("id,email")
    .eq("email", userEmail)
    .maybeSingle<UserRow>();
  return { session, user: byEmail ?? null };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SendNotificationRequest;
  const { session, user } = await lookupUserBySession();

  if (!session?.user?.email && !env.resendToEmail) {
    return NextResponse.json({ error: "You must sign in before sending email notifications." }, { status: 401 });
  }

  const recipientEmail = session?.user?.email ?? env.resendToEmail;
  if (!recipientEmail) {
    return NextResponse.json({ error: "No recipient email found." }, { status: 400 });
  }

  let selected: NotificationPayload | null = null;
  let persisted: NotificationRow | null = null;

  const notificationId = typeof body.notificationId === "string" ? body.notificationId : undefined;

  if (notificationId && user && env.supabaseUrl && env.supabaseServiceRoleKey) {
    const supabase = getSupabaseAdminClient();
    const { data: row } = await supabase
      .from("notifications")
      .select("id,user_id,task_id,intervention_id,channel,payload_json,delivery_status,sent_at")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle<NotificationRow>();

    if (row) {
      persisted = row;
      selected = rowToNotification(row);
    }
  }

  if (!selected && isNotificationPayload(body.notification)) {
    selected = body.notification;
  }

  if (!selected) {
    return NextResponse.json({ error: "No sendable notification found." }, { status: 404 });
  }

  if (selected.channel !== "email") {
    return NextResponse.json({ error: "Only email channel is supported for this endpoint." }, { status: 400 });
  }

  const adapter = getEmailAdapter();

  try {
    const result = await adapter.send(selected, recipientEmail);
    const sentAt = new Date().toISOString();
    const deliveryStatus: NotificationPayload["deliveryStatus"] = result.simulated ? "simulated" : "sent";

    if (persisted && env.supabaseUrl && env.supabaseServiceRoleKey) {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from("notifications")
        .update({
          delivery_status: deliveryStatus,
          sent_at: sentAt,
          payload_json: {
            ...persisted.payload_json,
            last_provider: result.provider,
            last_provider_message_id: result.providerMessageId ?? null,
          },
        })
        .eq("id", persisted.id)
        .eq("user_id", persisted.user_id);
    }

    return NextResponse.json({
      ok: true,
      notificationId: selected.id,
      deliveryStatus,
      simulated: result.simulated,
      provider: result.provider,
      providerMessageId: result.providerMessageId ?? null,
      sentAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected send failure";

    if (persisted && env.supabaseUrl && env.supabaseServiceRoleKey) {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from("notifications")
        .update({
          payload_json: {
            ...persisted.payload_json,
            last_error: message,
            last_error_at: new Date().toISOString(),
          },
        })
        .eq("id", persisted.id)
        .eq("user_id", persisted.user_id);
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
