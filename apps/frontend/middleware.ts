import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isOnboardingComplete, ONBOARDING_COOKIE_NAME } from "./lib/onboarding";

const ONBOARDING_PATH = "/onboarding";

export function middleware(request: NextRequest) {
  const isComplete = isOnboardingComplete(request.cookies.get(ONBOARDING_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;

  if (pathname === ONBOARDING_PATH) {
    if (isComplete) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!isComplete) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
