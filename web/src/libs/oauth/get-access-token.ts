import { NextRequest } from "next/server";

export type GetAccessTokenInput = {
  request: NextRequest;
  myshopifyDomain: string;
  apiKey: string;
  apiSecret: string;
};

export type GetAccessTokenPayload =
  | {
      success: true;
      accessToken: string;
      scopes: string;
    }
  | {
      success: false;
      failedMessage: string;
    };

export const getAccessToken = async ({
  myshopifyDomain,
  request,
  apiKey,
  apiSecret,
}: GetAccessTokenInput): Promise<GetAccessTokenPayload> => {
  // get access token
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  if (code == null) {
    return {
      success: false,
      failedMessage: "missing code.",
    };
  }

  const accessTokenParams = new URLSearchParams();
  accessTokenParams.set("client_id", apiKey);
  accessTokenParams.set("client_secret", apiSecret);
  accessTokenParams.set("code", code);

  const response = await fetch(getAccessTokenURL(myshopifyDomain), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: accessTokenParams,
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      success: false,
      failedMessage: text,
    };
  }

  const json = await response.json();
  const accessToken = json["access_token"] as string;
  const scopes = json["scope"] as string;
  return {
    success: true,
    accessToken,
    scopes,
  };
};

const getAccessTokenURL = (shop: string) => {
  return new URL(`https://${shop}/admin/oauth/access_token`);
};
