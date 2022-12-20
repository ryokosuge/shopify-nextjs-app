import { NextRequest } from "next/server";

export const validateState = (request: NextRequest): boolean => {
  const url = request.nextUrl.clone();
  const stateValue = url.searchParams.get("state");
  const state = request.cookies.get("state")?.value;
  return state != null && stateValue != null && state === stateValue;
};
