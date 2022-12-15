import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

export const middleware = (request: NextRequest) => {
  const url = request.nextUrl.clone();
  const shop = url.searchParams.get("shop") ?? "";
  const callbackURL = getCallbackURL();
  if (url.pathname !== callbackURL.pathname) {
    const state = generateState();
    const authorizationURL = getAuthorizationURL(url, callbackURL, shop, state);
    const res = NextResponse.redirect(authorizationURL);
    res.cookies.set("state", state);
    return res;
  }
  const res = NextResponse.next();
  return res;
};

const CALLBACK_URL_PATH = "/auth/callback";

const getCallbackURL = () => {
  return new URL(`${process.env.APP_URL}${CALLBACK_URL_PATH}`);
};

const generateState = () => {
  return uuid();
};

const getAuthorizationURL = (
  url: URL,
  callbackURL: URL,
  myshopifyDomain: string,
  state: string,
) => {
  const params = new URLSearchParams(url.searchParams);
  params.set("client_id", process.env.SHOPIFY_API_KEY);
  params.set("scope", process.env.SCOPES);
  params.set("redirect_uri", callbackURL.toString());
  params.set("state", state);
  const authorizationURL = new URL(
    `https://${myshopifyDomain}/admin/oauth/authorize`,
  );
  authorizationURL.search = params.toString();
  return authorizationURL;
};
