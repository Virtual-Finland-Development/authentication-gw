import { ErrorWithXmlStatus } from "node-saml/lib/types";
import { parseXml2JsFromString } from "node-saml/lib/xml";
import { Context } from "openapi-backend";
import { v4 as uuidv4 } from "uuid";
import { BaseRequestHandler } from "../../utils/BaseRequestHandler";

import { getJSONResponseHeaders } from "../../utils/default-headers";
import { AccessDeniedException, NoticeException, ValidationError } from "../../utils/exceptions";
import { debug, log } from "../../utils/logging";
import { prepareCookie, prepareLoginRedirectUrl, prepareLogoutRedirectUrl } from "../../utils/route-utils";
import { parseBase64XMLBody } from "../../utils/transformers";

import { AuthRequestHandler, HttpResponse } from "../../utils/types";
import { parseAppContext } from "../../utils/validators";
import SuomiFISettings from "./SuomiFI.config";
import { createSignedInTokens, generateSaml2RelayState, getJKWSJsonConfiguration } from "./SuomiFIAuthorizer";
import { getSuomiFISAML2Client } from "./utils/SuomiFISAML2";
import { createSuomiFiLoggedInCode, extractSuomiFiLoggedInState, parseSuomiFiBasicProfileFromIdToken } from "./utils/SuomifiStateTools";

/**
 * @see: https://palveluhallinta.suomi.fi/en/sivut/tunnistus/kayttoonotto/kayttoonoton-vaiheet
 * @see: https://en.wikipedia.org/wiki/SAML_2.0
 * @see: https://github.com/node-saml/node-saml
 */
export default new (class SuomiFIRequestHandler extends BaseRequestHandler implements AuthRequestHandler {
  identityProviderIdent = SuomiFISettings.ident;
  async initialize(): Promise<void> {}

  /**
   * GET->REDIRECT: The route for handling the auth flow initiating process
   *
   * @param context
   * @returns
   */
  async AuthenticationRequest(context: Context): Promise<HttpResponse> {
    const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent, guid: uuidv4() }); // throws
    const samlClient = await getSuomiFISAML2Client();
    const RelayState = await generateSaml2RelayState(parsedAppContext);
    const authenticationUrl = await samlClient.getAuthorizeUrlAsync(RelayState);

    return {
      statusCode: 303,
      headers: {
        Location: authenticationUrl,
      },
      cookies: [prepareCookie("appContext", parsedAppContext.hash)],
    };
  }

  /**
   * GET->REDIRECT: The route for handling the auth flow callback, redirecting back to the frontend app
   *
   * @param context
   * @returns AuthenticateResponse -> LoginResponse
   */
  async AuthenticateResponse(context: Context): Promise<HttpResponse> {
    const body = parseBase64XMLBody(context.request.body);
    const samlClient = await getSuomiFISAML2Client();

    try {
      const result = await samlClient.validatePostResponseAsync(body); // throws

      const { parsedAppContext, idToken, expiresAt, userId } = await createSignedInTokens(body.RelayState, result.profile); // throws
      const profileAssertion = result.profile.getAssertion();
      debug(profileAssertion);

      // Setup login state hash
      const loginCode = await createSuomiFiLoggedInCode({
        profileData: {
          profile: result.profile,
          context: {
            AuthnContextClassRef: profileAssertion["Assertion"]["AuthnStatement"][0]["AuthnContext"][0]["AuthnContextClassRef"][0]["_"],
          },
          email: result.profile.email,
          userId: userId,
        },
        idToken: idToken,
        expiresAt: expiresAt,
      });

      const redirectUrl = prepareLoginRedirectUrl(parsedAppContext.object.redirectUrl, loginCode, this.identityProviderIdent);

      return {
        statusCode: 303,
        headers: {
          Location: redirectUrl,
        },
        cookies: [prepareCookie("appContext", "")],
      };
    } catch (error) {
      if (error instanceof ErrorWithXmlStatus) {
        // Prepare correct failure response
        try {
          const xmlObj = await parseXml2JsFromString(error.xmlStatus);
          const statusValue = xmlObj.Status?.StatusCode?.[0]?.StatusCode?.[0]?.["$"]?.Value;
          switch (statusValue) {
            case "urn:oasis:names:tc:SAML:2.0:status:RequestDenied":
              error = new AccessDeniedException("Authentication provider rejected the request");
              break;
            case "urn:oasis:names:tc:SAML:2.0:status:AuthnFailed":
              error = new NoticeException("Authentication cancelled");
              break;
          }
        } catch (error) {
          debug("Parsing error", error);
        }
      }
      return this.getAuthenticateResponseFailedResponse(context, error);
    }
  }

  /**
   * POST: transform loginCode to LoginResponse
   *
   * @param context
   * @returns
   */
  async LoginRequest(context: Context): Promise<HttpResponse> {
    parseAppContext(context, { provider: this.identityProviderIdent }); // Valites app context
    const loginCode = context.request.requestBody.loginCode; // request body already validated by openapi-backend
    const loggedInState = await extractSuomiFiLoggedInState(loginCode);

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify({
        idToken: loggedInState.idToken,
        expiresAt: loggedInState.expiresAt,
        profileData: loggedInState.profileData,
      }),
    };
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow
   *
   * @param context
   * @returns
   */
  async LogoutRequest(context: Context): Promise<HttpResponse> {
    try {
      const parsedAppContext = parseAppContext(context, { provider: this.identityProviderIdent });
      const idToken = String(context.request.query.idToken);

      try {
        const loginProfile = parseSuomiFiBasicProfileFromIdToken(idToken);
        const samlClient = await getSuomiFISAML2Client();
        const logoutRequestUrl = await samlClient.getLogoutUrlAsync(loginProfile, parsedAppContext.hash);

        return {
          statusCode: 303,
          headers: {
            Location: logoutRequestUrl,
          },
        };
      } catch (error) {
        throw new ValidationError("Bad login profile data");
      }
    } catch (error) {
      return this.getLogoutRequestFailedResponse(context, error);
    }
  }

  /**
   * GET->REDIRECT: The route for handling the logout flow callback url
   *
   * @param context
   * @returns
   */
  async LogoutResponse(context: Context): Promise<HttpResponse> {
    const body = context.request.query;
    const originalQuery = new URLSearchParams(body).toString();
    const parsedAppContext = parseAppContext(String(body.RelayState), { provider: this.identityProviderIdent }); // throws

    const samlClient = await getSuomiFISAML2Client();
    try {
      await samlClient.validateRedirectAsync(body, originalQuery); // throws
    } catch (error) {
      log("LogoutResponse", error);
      return this.getLogoutRequestFailedResponse(parsedAppContext.hash, error);
    }

    return {
      statusCode: 303,
      headers: {
        Location: prepareLogoutRedirectUrl(parsedAppContext.object.redirectUrl, this.identityProviderIdent),
      },
    };
  }

  /**
   *  GET: The .well-known/jwks.json
   *
   * @param context
   * @returns
   */
  async WellKnownJWKSRequest(): Promise<HttpResponse> {
    const jwks = await getJKWSJsonConfiguration();

    return {
      statusCode: 200,
      headers: getJSONResponseHeaders(),
      body: JSON.stringify(jwks),
    };
  }
})();
