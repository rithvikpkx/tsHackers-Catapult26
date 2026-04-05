import { formatPercent } from "../ui/format";
import type { InterventionProposal, NotificationPayload, NormalizedTask, RiskAssessment } from "../contracts";

export function buildNotifications(
  highestRiskTask: NormalizedTask | undefined,
  risk: RiskAssessment | undefined,
  intervention: InterventionProposal | undefined,
): NotificationPayload[] {
  if (!highestRiskTask || !risk) {
    return [];
  }

  const notifications: NotificationPayload[] = [
    {
      id: `email-risk-${highestRiskTask.id}`,
      channel: "email",
      taskId: highestRiskTask.id,
      subject: `${highestRiskTask.title} is at ${formatPercent(risk.riskProbability)} risk`,
      preview: "Grind found a high-risk assignment and prepared a concrete recovery plan.",
      body: `${highestRiskTask.title} is at ${formatPercent(risk.riskProbability)} risk. ${risk.explanation}`,
      deliveryStatus: "simulated",
      sentAt: new Date().toISOString(),
    },
  ];

  if (intervention) {
    notifications.push({
      id: `email-intervention-${intervention.id}`,
      channel: "email",
      taskId: highestRiskTask.id,
      interventionId: intervention.id,
      subject: `Schedule updated: ${formatPercent(intervention.successProbabilityBefore)} -> ${formatPercent(intervention.successProbabilityAfter)}`,
      preview: intervention.summaryText,
      body: `${intervention.summaryText} ${intervention.rationaleText}`,
      deliveryStatus: "simulated",
      sentAt: new Date().toISOString(),
    });
  }

  return notifications;
}
