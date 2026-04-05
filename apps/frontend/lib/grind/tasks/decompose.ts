import type { AssignmentType, NormalizedTask, SourceMode, Subtask } from "../contracts";

function makeStep(
  taskId: string,
  title: string,
  sequence: number,
  estimatedMinutes: number,
  instructions: string,
  sourceMode: SourceMode,
  isSubmissionStep = false,
): Subtask {
  return {
    id: `${taskId}-step-${sequence + 1}`,
    taskId,
    title,
    instructions,
    sequence,
    estimatedMinutes,
    status: "pending",
    isSubmissionStep,
    sourceMode,
  };
}

function essaySteps(task: NormalizedTask): Subtask[] {
  return [
    makeStep(task.id, "Clarify the prompt", 0, 25, "Rewrite the prompt into one clear sentence and list deliverables.", "llm"),
    makeStep(task.id, "Choose a working thesis", 1, 35, "Draft two thesis options and keep the stronger one.", "llm"),
    makeStep(task.id, "Gather 3 credible sources", 2, 45, "Find evidence you can actually cite inside the paper.", "llm"),
    makeStep(task.id, "Draft the outline", 3, 40, "Create intro, 3 body sections, and conclusion bullets.", "llm"),
    makeStep(task.id, "Write the introduction and body", 4, 120, "Turn the outline into a clean first draft.", "llm"),
    makeStep(task.id, "Revise citations and final proof", 5, 55, "Fix citations, transitions, and formatting issues.", "llm"),
    makeStep(task.id, "Submit assignment", 6, 10, "Upload the final file and confirm the submission receipt.", "llm", true),
  ];
}

function programmingSteps(task: NormalizedTask): Subtask[] {
  return [
    makeStep(task.id, "Inspect prompt and examples", 0, 25, "List required behaviors, edge cases, and any grading constraints.", "llm"),
    makeStep(task.id, "Sketch solution structure", 1, 30, "Write the function breakdown before touching code.", "llm"),
    makeStep(task.id, "Implement the core path", 2, 85, "Finish the main logic for the worksheet problems.", "llm"),
    makeStep(task.id, "Debug edge cases", 3, 55, "Run through deadlock and synchronization edge cases deliberately.", "llm"),
    makeStep(task.id, "Final review and polish", 4, 30, "Check answers, comments, and formatting.", "llm"),
    makeStep(task.id, "Submit assignment", 5, 10, "Upload the worksheet and verify Brightspace accepted it.", "llm", true),
  ];
}

function worksheetSteps(task: NormalizedTask): Subtask[] {
  return [
    makeStep(task.id, "Scan every question", 0, 20, "Identify which questions are conceptual versus computational.", "llm"),
    makeStep(task.id, "Solve the first half", 1, 60, "Work through the easier items without perfectionism.", "llm"),
    makeStep(task.id, "Solve the harder questions", 2, 70, "Spend uninterrupted time on the highest-friction items.", "llm"),
    makeStep(task.id, "Check reasoning and final answers", 3, 30, "Review each answer for correctness and completeness.", "llm"),
    makeStep(task.id, "Submit assignment", 4, 10, "Upload the worksheet and confirm the timestamp.", "llm", true),
  ];
}

function genericSteps(task: NormalizedTask): Subtask[] {
  return [
    makeStep(task.id, "Clarify what counts as done", 0, 20, "List the exact deliverable and required materials.", "heuristic"),
    makeStep(task.id, "Complete the main work block", 1, Math.max(45, Math.round(task.estimatedEffortMinutesBase * 0.7)), "Do the largest chunk while the deadline is still comfortable.", "heuristic"),
    makeStep(task.id, "Review and submit", 2, 20, "Check quality, then submit the finished work.", "heuristic", true),
  ];
}

export function generateSubtasks(task: NormalizedTask): Subtask[] {
  const byType: Record<AssignmentType, (task: NormalizedTask) => Subtask[]> = {
    essay: essaySteps,
    programming_assignment: programmingSteps,
    worksheet: worksheetSteps,
    problem_set: worksheetSteps,
    quiz_prep: genericSteps,
    exam_prep: genericSteps,
    reading: genericSteps,
    discussion_post: genericSteps,
    lab: worksheetSteps,
    project: programmingSteps,
    other: genericSteps,
  };

  return byType[task.assignmentType](task);
}
