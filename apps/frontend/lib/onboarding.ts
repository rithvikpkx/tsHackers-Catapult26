export const ONBOARDING_COOKIE_NAME = "grind_onboarding_complete";
export const ONBOARDING_COOKIE_VALUE = "true";
export const ONBOARDING_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isOnboardingComplete(cookieValue: string | undefined) {
  return cookieValue === ONBOARDING_COOKIE_VALUE;
}
