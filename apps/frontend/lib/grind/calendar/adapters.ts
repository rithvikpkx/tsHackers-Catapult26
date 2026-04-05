import type { InterventionProposal, RawCalendarEvent } from "../contracts";

export interface CalendarAdapter {
  syncUpcomingEvents(): Promise<RawCalendarEvent[]>;
  writeIntervention(intervention: InterventionProposal): Promise<{ mode: "mirrored_proposal" | "direct_write"; success: boolean }>;
}

export class DemoCalendarAdapter implements CalendarAdapter {
  constructor(private readonly seededEvents: RawCalendarEvent[]) {}

  async syncUpcomingEvents(): Promise<RawCalendarEvent[]> {
    return this.seededEvents;
  }

  async writeIntervention(): Promise<{ mode: "mirrored_proposal"; success: true }> {
    return { mode: "mirrored_proposal", success: true };
  }
}
