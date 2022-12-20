import { v4 as uuid } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import { validateState } from "./validate-state";
import { validateHMAC } from "./validate-hmac";
import { getAccessToken } from "./get-access-token";

export type OAuthMiddlewarePayload = {
  accessToken: string;
};

export type OAuthMiddlewareProps = {
  apiKey: string;
  apiSecret: string;
  scope: string;
  appURL: string;
};

const CALLBACK_URL_PATH = "/auth/callback";

export class OAuthMiddleware {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly scope: string;
  readonly appURL: string;

  constructor(props: OAuthMiddlewareProps) {
    this.apiKey = props.apiKey;
    this.apiSecret = props.apiSecret;
    this.scope = props.scope;
    this.appURL = props.appURL;
  }

  public async authenticate(
    request: NextRequest,
  ): Promise<OAuthMiddlewarePayload> {
    const url = request.nextUrl.clone();
    const shopDomain = url.searchParams.get("shop");
    if (shopDomain == null) {
      throw this.makeMissingResponse("missing shop domain.");
    }

    const callbackURL = this.getCallbackURL();
    if (url.pathname !== callbackURL.pathname) {
      const state = this.generateState();
      const authorizationURL = this.getAuthorizationURL(
        shopDomain,
        callbackURL,
        state,
      );
      const response = NextResponse.redirect(authorizationURL);
      response.cookies.set("state", state);
      throw response;
    }

    if (!validateState(request)) {
      throw this.makeMissingResponse("missing state.");
    }

    if (!validateHMAC({ request, apiSecret: this.apiSecret })) {
      throw this.makeMissingResponse("missing hmac.");
    }

    const result = await getAccessToken({
      myshopifyDomain: shopDomain,
      request,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
    });

    if (!result.success) {
      throw this.makeMissingResponse(result.failedMessage);
    }

    return {
      accessToken: result.accessToken,
    };
  }

  private getAuthorizationURL(
    myshopifyDomain: string,
    callbackURL: URL,
    state: string,
  ) {
    const params = new URLSearchParams();
    params.set("client_id", this.apiKey);
    params.set("scope", this.scope);
    params.set("redirect_uri", callbackURL.toString());
    params.set("state", state);
    const authorizationURL = new URL(
      `https://${myshopifyDomain}/admin/oauth/authorize`,
    );
    authorizationURL.search = params.toString();
    return authorizationURL;
  }

  private generateState() {
    return uuid();
  }

  private getCallbackURL() {
    return new URL(`${this.appURL}${CALLBACK_URL_PATH}`);
  }

  private makeMissingResponse(message: string) {
    return new NextResponse(JSON.stringify({ message }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
}
