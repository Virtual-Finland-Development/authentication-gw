# Frontend app usage

## Example login apps

The example login apps that demonstrates how to use the authentication gw in a browser:

- Simple: [../webapps/simple/index.html](../webapps/simple/index.html)
  - is a simple dependency-free html document
- Svelte: [../webapps/svelte/](../webapps/svelte/)
  - is a svelte+vite app with OpenAPI typescript generators for authgw API client
  - needs an authgw server running and referenced in [../webapps/svelte/src/AppSettings.ts](../webapps/svelte/src/AppSettings.ts)

See the auth provider specifics at [./auth-providers.md](./auth-providers.md).

Usage: fill the `authAPIHost` variable with the address of the auth gw and open the file in a browser.

## Requests

Requests to the backend are accompanied with an `appContext` token which is a base64 encoded and url encoded string of the following JSON object:

```json
{
  "appName": "app-name",
  "redirectUrl": "url-back-to-the-login-handler-in-the-app"
}
```

eg.

```js
encodeURIComponent(btoa(JSON.stringify({ appName: "TMT-test", redirectUrl: "url-back-to-the-login-handler-in-the-app" })));
```

> eyJhcHBOYW1lIjoiVE1ULXRlc3QiLCJyZWRpcmVjdFVybCI6InVybC1iYWNrLXRvLXRoZS1sb2dpbi1oYW5kbGVyLWluLXRoZS1hcHAifQ%3D%3D

Example token generating function in typescript:

```ts
type AppContextObject = {
  appName: string;
  redirectUrl: string;
};

export function generateAppContext(appContextObject: AppContextObject): string {
  return encodeURIComponent(btoa(JSON.stringify(appContextObject)));
}
```

## LoginRequest

Redirect user to the `/auth/openid/sinuna/login-request`-endpoint with the `appContext` token as a query parameter:

```js
window.location.href = `https://${authEndpointHost}/auth/openid/sinuna/login-request?appContext=${appContext}`;
```

## LoginResponse

After the auth process is done, the user is redirected to the `redirectUrl` predefined in the `appContext`-variable with a `loginCode` token as a query parameter.

eg: `https://${frontendAppHost}/login-handler.html?loginCode={loginCode}&provider=sinuna`

The login code is either a temporary code that can be exchanged for authentication tokens.

### On a Login error

If login fails / the attempt is cancelled etc, the user is redirected to the `redirectUrl` with a query parameters package:

- `error`: the error message
- `type`: message type, one of `danger`, `warning`, `info`
- `provider`: authentication provider, eg. `sinuna`
- `intent=LoginRequest`: intent of the request, with a login situation its always `LoginRequest`

eg: `https://${frontendAppHost}/login-handler.html?error=Authentication+cancelled&type=info&provider=sinuna&intent=LoginRequest`

## AuthTokenRequest

The received `loginCode` is a temporary code which is used in retrieving the actual auth tokens from the `/auth/openid/sinuna/auth-token-request`-endpoint.

```js
const response = await fetch(`https://${authEndpointHost}/auth/openid/sinuna/auth-token-request`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    loginCode: loginCode,
    appContext: appContext, // url-encoded base64 string
  }),
});
const { accessToken, idToken } = await response.json();
```

The retrieved tokens:

- idToken: a JWT token that can be used to authenticate the user in the backend
- accessToken: a hash that can be used to retrieve user information with the UserInfoRequest-call

Store the token in the browser's local storage.

eg.

```js
localStorage.setItem(`idToken_sinuna`, idToken);
```

## Using the auth token

Requests to the protected external backend services are accompanied with the `idToken` as a bearer token in the `Authorization` header, accomppanied with a provider name in the `X-authorization-provider` header.

eg:

```js
fetch(`https://data-product-endpoint.example`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
    "X-authorization-provider": "sinuna",
  },
});
```

If the endpoint need authorization and the request fails with a `401` status code, the token is expired and the user should be redirected to the login page.

### UserInfoRequest

In the frontend app the `accessToken` could be used like this:

```js
const response = await fetch(`https://${authEndpointHost}/auth/openid/sinuna/user-info-request`, {
  method: "POST",
  credentials: "include", // Make sure to include cookies
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    accessToken: accessToken,
    appContext: appContext, // url-encoded base64 string
  }),
});

const { email } = await response.json();
```

If the request fails with a `401` status code, the token is expired and the user should be redirected to the login page.

## LogoutRequest

Redirect user to the `/auth/openid/sinuna/logout-request`-endpoint with the `appContext` and `idToken` token as a query parameter:

```js
window.location.href = `https://${authEndpointHost}/auth/openid/sinuna/logout-request?appContext=${appContext}&idToken=${idToken}`;
```

## LogoutResponse

After the logout process is done, the user is redirected to the `redirectUrl` predefined in the `appContext`-variable, with a `logout=success` query parameter.

eg: `https://${frontendAppHost}/login-handler.html?logout=success&provider=sinuna`

### On a Logout error

If logout fails / user is already logged out etc, the user is redirected to the `redirectUrl` with with a query parameters package:

- `error`: the error message
- `type`: message type, one of `danger`, `warning`, `info`
- `provider`: authentication provider, eg. `sinuna`
- `intent=LogoutRequest`: intent of the request, with a logout situation its always `LogoutRequest`

eg: `https://${frontendAppHost}/login-handler.html?error=Already+logged+out&type=info&provider=sinuna&intent=LogoutRequest`
