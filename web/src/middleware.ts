import { NextRequest, NextResponse } from "next/server";
import { OAuthMiddleware } from "./libs/oauth/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|favicon.ico).*)",
  ],
};

export const middleware = async (request: NextRequest) => {
  const url = request.nextUrl.clone();
  console.info(JSON.stringify({ url }, null, 4));
  const shop = url.searchParams.get("shop") ?? "";
  const host = url.searchParams.get("host") ?? "";
  console.info(JSON.stringify({ shop }, null, 4));

  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, APP_URL } = process.env;
  const oauthMiddleware = new OAuthMiddleware({
    apiKey: SHOPIFY_API_KEY,
    apiSecret: SHOPIFY_API_SECRET,
    scope: SCOPES,
    appURL: APP_URL,
  });

  try {
    const result = await oauthMiddleware.authenticate(request);
    console.info(JSON.stringify(result, null, 4));
  } catch (err) {
    if (err instanceof NextResponse) {
      console.error(err);
      return err;
    }
  }

  const redirectURL = new URL("/", url);
  redirectURL.searchParams.append("shop", shop);
  redirectURL.searchParams.append("host", host);
  const res = NextResponse.redirect(redirectURL);
  res.cookies.delete("state");
  return res;
};
