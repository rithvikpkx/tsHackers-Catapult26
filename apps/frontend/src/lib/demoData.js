export const DEMO_TASKS = [
  { id: "os-pset",        name: "OS Problem Set",       subtitle: "Critical · due tomorrow", dot: "red",   badge: "high",   label: "78%" },
  { id: "lecture-notes",  name: "Review lecture notes", subtitle: "Ready now",               dot: "green", badge: "low",    label: "18m" },
  { id: "email-prof",     name: "Email professor",      subtitle: "Quick",                   dot: "gray",  badge: "low",    label: "6m"  },
  { id: "laundry",        name: "Laundry",              subtitle: "Due soon",                dot: "amber", badge: "medium", label: "35m" },
  { id: "gym",            name: "Gym",                  subtitle: "Safe to push",            dot: "green", badge: "low",    label: "1h"  },
];

export const DEMO_DISTORTION = [
  "You underestimate programming work by 2.1×",
  "You start work 1.8 days later than planned",
  "Your best focus window is 9 PM–1 AM",
  "Thursday schedule leaves too little uninterrupted time",
];

export const DEMO_INTERVENTION = {
  probBefore: 22,
  probAfter: 91,
  description:
    "Grind moved your Thursday gym session and reserved a 4-hour focus block for the OS problem set. Starting tonight prevents a downstream Friday squeeze.",
};

export const DEMO_METRICS = {
  healthScore: 74,
  healthLabel: "Stable",
  atRiskCount: 3,
  distortionMultiplier: 2.1,
};
