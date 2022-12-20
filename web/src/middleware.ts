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
    "/((?!api|_next/static|favicon.ico|vercel.svg).*)",
  ],
};

export const middleware = async (request: NextRequest) => {
  const url = request.nextUrl.clone();
  console.info(JSON.stringify({ url }, null, 4));
  const myshopifyDomain = url.searchParams.get("shop") ?? "";
  const host = url.searchParams.get("host") ?? "";
  console.info(JSON.stringify({ myshopifyDomain, host }, null, 4));

  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken != null) {
    console.info(JSON.stringify({ accessToken }, null, 4));
    const res = NextResponse.next();
    return res;
  }

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

    const redirectURL = new URL("/", url);
    redirectURL.searchParams.append("shop", myshopifyDomain);
    redirectURL.searchParams.append("host", host);
    const res = NextResponse.redirect(redirectURL);
    res.cookies.set("access_token", result.accessToken);
    res.cookies.delete("state");
    return res;
  } catch (err) {
    console.error(err);
    if (err instanceof NextResponse) {
      return err;
    }
    throw err;
  }
};
