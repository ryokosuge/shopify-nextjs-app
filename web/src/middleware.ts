import { NextRequest, NextResponse } from "next/server";

export const middleware = (request: NextRequest) => {
  console.info(request);
  const res = NextResponse.next();
  console.info(res);
  return res;
};
