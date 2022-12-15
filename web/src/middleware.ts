import { scrypt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

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
  const shop = url.searchParams.get("shop") ?? "";
  const callbackURL = getCallbackURL();
  if (url.pathname !== callbackURL.pathname) {
    const state = generateState();
    const authorizationURL = getAuthorizationURL(url, callbackURL, shop, state);
    const res = NextResponse.redirect(authorizationURL);
    res.cookies.set("state", state);
    return res;
  }

  // callback
  const stateValue = url.searchParams.get("state");
  const state = request.cookies.get("state")?.value;
  if (stateValue == null || state == null) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "missing state." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const res = NextResponse.next();
  if (stateValue === state) {
    res.cookies.delete("state");
  } else {
    // invalid
    return new NextResponse(
      JSON.stringify({ success: false, message: "state does not match." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  // check HMAC
  const hmac = url.searchParams.get("hmac");
  if (hmac == null) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "missing hmac." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  url.searchParams.delete("hmac");
  const message = url.searchParams.toString();
  console.info(JSON.stringify({ hmac, message }, null, 4));
  const secretKey = process.env.SHOPIFY_API_SECRET;
  const cryptoLib =
    typeof (crypto as any)?.webcrypto === "undefined"
      ? (crypto as any)
      : (crypto as any).webcrypto;

  let hash: string;
  if (cryptoLib.subtle) {
    const enc = new TextEncoder();
    const key = await cryptoLib.subtle.importKey(
      "raw",
      enc.encode(secretKey),
      {
        name: "HMAC",
        hash: { name: "SHA-256" },
      },
      false,
      ["sign"],
    );
    const signature = await cryptoLib.subtle.sign(
      "HMAC",
      key,
      enc.encode(message),
    );
    hash = asHex(signature);
  } else {
    hash = cryptoLib
      .createHmac("sha256", secretKey)
      .update(message, "utf-8")
      .digest("base64");
  }

  if (!safeCompare(hmac, hash)) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "hmac does not match." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  // get access token
  const code = url.searchParams.get("code");
  if (code == null) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "missing code." }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const accessTokenParams = new URLSearchParams();
  accessTokenParams.set("client_id", process.env.SHOPIFY_API_KEY);
  accessTokenParams.set("client_secret", secretKey);
  accessTokenParams.set("code", code);

  const response = await fetch(getAccessTokenURL(shop), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: accessTokenParams,
  });

  if (!response.ok) {
    const text = await response.text();
    return new NextResponse(JSON.stringify({ success: false, message: text }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const json = await response.json();
  const accessToken = json["access_token"] as string;
  const scopes = json["scope"] as string;
  console.info(JSON.stringify({ accessToken, scopes }, null, 4));
  return res;
};

const CALLBACK_URL_PATH = "/auth/callback";

const getCallbackURL = () => {
  return new URL(`${process.env.APP_URL}${CALLBACK_URL_PATH}`);
};

const getAccessTokenURL = (shop: string) => {
  return new URL(`https://${shop}/admin/oauth/access_token`);
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

/**
 * A timing safe string comparison utility.
 *
 * @param strA any string, array of strings, or object with string values
 * @param strB any string, array of strings, or object with string values
 */
const safeCompare = (strA: string, strB: string): boolean => {
  if (typeof strA !== typeof strB) {
    return false;
  }

  const buffA = Buffer.from(strA);
  const buffB = Buffer.from(strB);

  if (buffA.length === buffB.length) {
    return timingSafeEqual(buffA, buffB);
  }

  return false;
};

// Buffer must be same length for this function to be secure.
function timingSafeEqual(bufA: ArrayBuffer, bufB: ArrayBuffer): boolean {
  const viewA = new Uint8Array(bufA);
  const viewB = new Uint8Array(bufB);
  let out = 0;
  for (let i = 0; i < viewA.length; i++) {
    out |= viewA[i] ^ viewB[i];
  }
  return out === 0;
}

export function asHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
