import type { AssignmentType, DistortionProfileSummary, TaskObservation } from "../contracts";

const weakPriors: Record<AssignmentType, number> = {
  essay: 1.8,
  problem_set: 1.6,
  programming_assignment: 2.1,
  worksheet: 1.4,
  quiz_prep: 1.5,
  exam_prep: 2.2,
  reading: 1.3,
  discussion_post: 1.2,
  lab: 1.7,
  project: 2.0,
  other: 1.45,
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function buildDistortionProfile(userId: string, observations: TaskObservation[]): DistortionProfileSummary {
  const multipliers = { ...weakPriors };

  for (const assignmentType of Object.keys(weakPriors) as AssignmentType[]) {
    const relevant = observations.filter((observation) => observation.assignmentType === assignmentType);
    if (relevant.length === 0) {
      continue;
    }
    const observedMultiplier = average(
      relevant.map((observation) => observation.actualEffortMinutes / Math.max(observation.expectedEffortMinutes, 1)),
    );
    multipliers[assignmentType] = Number(((weakPriors[assignmentType] * 2 + observedMultiplier * relevant.length) / (2 + relevant.length)).toFixed(2));
  }

  const meanStartDelayMinutes = Math.round(average(observations.map((observation) => observation.derivedStartDelayMinutes)) || 1320);
  const meanSubmissionOffsetMinutes = Math.round(average(observations.map((observation) => observation.derivedSubmissionOffsetMinutes)) || 55);
  const reliabilityScore = Number(
    (
      observations.filter((observation) => observation.derivedSubmissionOffsetMinutes >= 0).length /
      Math.max(observations.length, 1)
    ).toFixed(2),
  );

  const sourceMode = observations.length >= 5 ? "personalized" : observations.length >= 2 ? "blended" : "weak_prior";
  const confidenceLevel = observations.length >= 5 ? "high" : observations.length >= 2 ? "medium" : "low";

  return {
    userId,
    profileVersion: 2,
    underestimationMultipliers: multipliers,
    meanStartDelayMinutes,
    meanSubmissionOffsetMinutes,
    bestFocusStartHour: 21,
    bestFocusEndHour: 1,
    preferredDays: ["Sunday", "Monday", "Tuesday"],
    reliabilityScore,
    availabilityMismatchScore: 0.72,
    confidenceLevel,
    sourceMode,
    highlights: [
      `You underestimate programming work by ${multipliers.programming_assignment.toFixed(1)}x.`,
      `You usually start assignments about ${(meanStartDelayMinutes / 60 / 24).toFixed(1)} days later than ideal.`,
      "Your cleanest focus window is 9 PM to 1 AM.",
    ],
  };
}
