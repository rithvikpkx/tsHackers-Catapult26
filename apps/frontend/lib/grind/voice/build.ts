import { formatPercent } from "../ui/format";
import type { InterventionProposal, NormalizedTask, RiskAssessment, VoiceCallScript, VoiceIntent } from "../contracts";

export function buildVoiceCall(
  highestRiskTask: NormalizedTask | undefined,
  risk: RiskAssessment | undefined,
  intervention: InterventionProposal | undefined,
  userResponse?: VoiceIntent,
): VoiceCallScript | undefined {
  if (!highestRiskTask || !risk || risk.riskLevel !== "high") {
    return undefined;
  }

  return {
    id: `voice-${highestRiskTask.id}`,
    taskId: highestRiskTask.id,
    interventionId: intervention?.id,
    title: `Urgent reminder for ${highestRiskTask.title}`,
    opening: `Hi, this is Grind. I'm calling because ${highestRiskTask.title} needs attention today.`,
    riskLine: `${highestRiskTask.title} is currently at ${formatPercent(risk.riskProbability)} risk of missing the deadline.`,
    actionLine: intervention
      ? `${intervention.summaryText} Say start now to begin your first step, or remind me later if you need a short delay.`
      : `You still have a recoverable path if you start the first step now.`,
    choices: [
      { intent: "start_now", label: "I'll start now" },
      { intent: "remind_me_later", label: "Remind me later" },
      { intent: "acknowledged", label: "I heard it" },
    ],
    status: userResponse ? "responded" : "placed",
    userResponse,
  };
}
