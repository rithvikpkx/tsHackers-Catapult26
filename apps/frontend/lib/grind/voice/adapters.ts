import type { VoiceCallScript } from "../contracts";

export interface VoiceAdapter {
  placeCall(script: VoiceCallScript): Promise<{ simulated: boolean }>;
}

export class DemoVoiceAdapter implements VoiceAdapter {
  async placeCall(): Promise<{ simulated: true }> {
    return { simulated: true };
  }
}
