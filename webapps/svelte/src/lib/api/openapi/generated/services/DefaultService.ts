/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConsentDataSource } from '../models/ConsentDataSource';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DefaultService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * @returns void
     * @throws ApiError
     */
    public root(): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/',
            errors: {
                303: `Redirect to the API documentation`,
            },
        });
    }

    /**
     * @returns string Swagger API documentation
     * @throws ApiError
     */
    public swagger(): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/docs',
        });
    }

    /**
     * @returns string Health check response
     * @throws ApiError
     */
    public healthCheck(): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/health',
        });
    }

    /**
     * @returns any Access granted message
     * @throws ApiError
     */
    public authorizeRequest({
        authorization,
        xConsentToken,
        xConsentDataSource,
        xConsentUserId,
    }: {
        /**
         * id_token as a bearer header
         */
        authorization: string,
        /**
         * Optional consent token, the consent will be verified if the given authorization issuer has a consent service
         */
        xConsentToken?: string,
        /**
         * Data source URI for the consent verification context
         */
        xConsentDataSource?: string,
        /**
         * Extra check for consent verification context
         */
        xConsentUserId?: string,
    }): CancelablePromise<{
        message: string;
        authorization: {
            userId?: string;
            email?: string;
            expiresAt?: number;
            issuedAt?: number;
            issuer?: string;
        };
        consent?: {
            dataSource?: string;
            userId?: string;
            email?: string;
            expiresAt?: number;
            issuedAt?: number;
            issuer?: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/authorize',
            headers: {
                'Authorization': authorization,
                'X-Consent-Token': xConsentToken,
                'X-Consent-Data-Source': xConsentDataSource,
                'X-Consent-User-Id': xConsentUserId,
            },
            errors: {
                401: `Access denied`,
            },
        });
    }

    /**
     * @returns any Verified message
     * @throws ApiError
     */
    public testbedConsentVerify({
        xConsentToken,
        authorization,
        xConsentDataSource,
        xConsentUserId,
    }: {
        xConsentToken: string,
        authorization?: string,
        /**
         * Data source URI for the consent verification context
         */
        xConsentDataSource?: string,
        /**
         * Extra check for consent verification context
         */
        xConsentUserId?: string,
    }): CancelablePromise<{
        message?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/consents/testbed/consent-verify',
            headers: {
                'X-Consent-Token': xConsentToken,
                'Authorization': authorization,
                'X-Consent-Data-Source': xConsentDataSource,
                'X-Consent-User-Id': xConsentUserId,
            },
            errors: {
                401: `Unverified message`,
            },
        });
    }

    /**
     * Check the testbed consent status for a dataSource
     * @returns any Redirect to the testbed consent service, or back to the app context
     * @throws ApiError
     */
    public testbedConsentCheck({
        authorization,
        requestBody,
    }: {
        /**
         * id_token as a bearer header
         */
        authorization: string,
        /**
         * Retrieve the authentication token from the auth provider service
         */
        requestBody: {
            /**
             * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
             */
            appContext: string;
            /**
             * Testbed data sources
             */
            dataSources: Array<ConsentDataSource>;
        },
    }): CancelablePromise<Array<({
        consentStatus: string;
        redirectUrl: string;
        dataSource: string;
    } | {
        consentStatus: string;
        consentToken: string;
        dataSource: string;
    })>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/consents/testbed/consent-check',
            headers: {
                'Authorization': authorization,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Access denied`,
            },
        });
    }

    /**
     * Transition to the testbed consent page
     * @returns void
     * @throws ApiError
     */
    public testbedConsentRequest({
        appContext,
        authorization,
        dataSource,
        idToken,
    }: {
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        appContext: string,
        /**
         * id_token as a bearer header
         */
        authorization?: string,
        /**
         * Testbed data source uri
         */
        dataSource?: string,
        /**
         * id_token
         */
        idToken?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/consents/testbed/consent-request',
            headers: {
                'Authorization': authorization,
            },
            query: {
                'appContext': appContext,
                'dataSource': dataSource,
                'idToken': idToken,
            },
            errors: {
                303: `Redirect to the testbed consent service, or back to the app context`,
                401: `Access denied`,
            },
        });
    }

    /**
     * Transition from the testbed consent page back to the app context
     * @returns void
     * @throws ApiError
     */
    public testbedConsentResponse(): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/consents/testbed/consent-response',
            errors: {
                303: `Redirect back to the app context`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public openIdAuthenticationRequest({
        provider,
        appContext,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        appContext: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/openid/{provider}/authentication-request',
            path: {
                'provider': provider,
            },
            query: {
                'appContext': appContext,
            },
            errors: {
                303: `Redirect to the authentication provider service`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public openIdAuthenticateResponse({
        provider,
        code,
        state,
        acrValues,
        scope,
        sessionState,
        sid,
        nonce,
        error,
        errorDescription,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Login code
         */
        code?: string,
        /**
         * Login state string
         */
        state?: string,
        acrValues?: string,
        scope?: string,
        sessionState?: string,
        sid?: string,
        nonce?: string,
        error?: string,
        errorDescription?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/openid/{provider}/authenticate-response',
            path: {
                'provider': provider,
            },
            query: {
                'code': code,
                'state': state,
                'acr_values': acrValues,
                'scope': scope,
                'session_state': sessionState,
                'sid': sid,
                'nonce': nonce,
                'error': error,
                'error_description': errorDescription,
            },
            errors: {
                303: `Authentication providers callback url, redirect back to the app context, provide loginCode and provider -variables as query params`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public openIdLogoutRequest({
        provider,
        appContext,
        idToken,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        appContext: string,
        /**
         * Logout id_token hint
         */
        idToken?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/openid/{provider}/logout-request',
            path: {
                'provider': provider,
            },
            query: {
                'appContext': appContext,
                'idToken': idToken,
            },
            errors: {
                303: `Redirect to the authentication provider services logout endpoint`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public openIdLogoutResponse({
        provider,
        state,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        state?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/openid/{provider}/logout-response',
            path: {
                'provider': provider,
            },
            query: {
                'state': state,
            },
            errors: {
                303: `Authentication providers callback url, redirect back to the app context`,
            },
        });
    }

    /**
     * @returns any Logged In Response
     * @throws ApiError
     */
    public openIdLoginRequest({
        provider,
        requestBody,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Retrieve the authentication token from the auth provider service
         */
        requestBody: {
            loginCode: string;
            appContext: string;
        },
    }): CancelablePromise<{
        idToken: string;
        /**
         * an ISO-8601 timestamp string that specifies the token expirity datetime
         */
        expiresAt: string;
        profileData: {
            userId: string;
            email?: string;
            profile?: {
                sub?: string;
                inum?: string;
            };
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/openid/{provider}/login-request',
            path: {
                'provider': provider,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Logged In details retrieval failed`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public saml2AuthenticationRequest({
        provider,
        appContext,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        appContext: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/saml2/{provider}/authentication-request',
            path: {
                'provider': provider,
            },
            query: {
                'appContext': appContext,
            },
            errors: {
                303: `Redirect to the authentication provider service`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public saml2AuthenticateResponse({
        provider,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/saml2/{provider}/authenticate-response',
            path: {
                'provider': provider,
            },
            errors: {
                303: `Authentication providers callback url, redirect back to the app context`,
            },
        });
    }

    /**
     * @returns any Logged In Response
     * @throws ApiError
     */
    public saml2LoginRequest({
        provider,
        requestBody,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Retrieve the authentication token from the auth provider service
         */
        requestBody: {
            loginCode: string;
            appContext: string;
        },
    }): CancelablePromise<{
        idToken: string;
        /**
         * an ISO-8601 timestamp string that specifies the token expirity datetime
         */
        expiresAt: string;
        profileData: {
            userId: string;
            email?: string;
            profile: {
                nameID: string;
                email?: string;
            };
            context: {
                AuthnContextClassRef: string;
            };
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/saml2/{provider}/login-request',
            path: {
                'provider': provider,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Logged-in details retrieval failed`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public saml2LogoutRequest({
        provider,
        appContext,
        idToken,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Base64Url-encoded object with attributes eg: {appName: string, redirectUrl: string}
         */
        appContext: string,
        /**
         * Logout id_token hint
         */
        idToken?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/saml2/{provider}/logout-request',
            path: {
                'provider': provider,
            },
            query: {
                'appContext': appContext,
                'idToken': idToken,
            },
            errors: {
                303: `Redirect to the authentication provider service`,
            },
        });
    }

    /**
     * @returns void
     * @throws ApiError
     */
    public saml2LogoutResponse({
        provider,
        samlResponse,
        relayState,
        sigAlg,
        signature,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
        /**
         * Logout response
         */
        samlResponse: string,
        /**
         * State string
         */
        relayState: string,
        /**
         * SigAlg
         */
        sigAlg: string,
        /**
         * Signature
         */
        signature: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/saml2/{provider}/logout-response',
            path: {
                'provider': provider,
            },
            query: {
                'SAMLResponse': samlResponse,
                'RelayState': relayState,
                'SigAlg': sigAlg,
                'Signature': signature,
            },
            errors: {
                303: `Authentication providers callback url, redirect back to the app context`,
            },
        });
    }

    /**
     * @returns any .well-known/jwks.json
     * @throws ApiError
     */
    public saml2WellKnownJwksRequest({
        provider,
    }: {
        /**
         * Auth provider ident
         */
        provider: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/saml2/{provider}/.well-known/jwks.json',
            path: {
                'provider': provider,
            },
        });
    }

}
