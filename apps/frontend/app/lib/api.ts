import { cache } from "react";
import { getScenarioSnapshot } from "@/lib/grind/repository/demo-store";

export const loadScenario = cache(async () => getScenarioSnapshot());
