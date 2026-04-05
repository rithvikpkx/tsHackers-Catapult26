import { cache } from "react";
import { env } from "@/lib/grind/config/env";
import { LiveStoreError, buildGuestScenario, getLiveScenarioSnapshot } from "@/lib/grind/repository/live-store";
import { syncGoogleCalendarForCurrentUser } from "@/lib/grind/repository/live-sync";
import { getScenarioSnapshot } from "@/lib/grind/repository/demo-store";

export const loadScenario = cache(async () => {
  if (env.demoMode) {
    return getScenarioSnapshot();
  }

  try {
    const snapshot = await getLiveScenarioSnapshot();

    if (snapshot.user.googleConnected && snapshot.tasks.length === 0) {
      try {
        await syncGoogleCalendarForCurrentUser();
        return await getLiveScenarioSnapshot();
      } catch {
        return snapshot;
      }
    }

    return snapshot;
  } catch (error) {
    if (error instanceof LiveStoreError && error.code === "schema_missing") {
      return buildGuestScenario("Live mode is configured, but the database or calendar sync is not ready yet.");
    }
    throw error;
  }
});
