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

## AuthenticationRequest

Redirect user to the `/auth/openid/sinuna/authentication-request`-endpoint with the `appContext` token as a query parameter:

```js
window.location.href = `https://${authEndpointHost}/auth/openid/sinuna/authentication-request?appContext=${appContext}`;
```

## AuthenticationResponse

After the auth process is done, the user is redirected to the `redirectUrl` predefined in the `appContext`-variable with a `loginCode` token as a query parameter.

eg: `https://${frontendAppHost}/login-handler.html?loginCode={loginCode}&provider=sinuna`

The login code is either a temporary code that can be exchanged for authentication tokens.

### On a Login error

If login fails / the attempt is cancelled etc, the user is redirected to the `redirectUrl` with a query parameters package:

- `success=false`, string-boolean, `false` if login fails, `true` on success
- `message`: the error message
- `type`: message type, one of `danger`, `warning`, `info`
- `provider`: authentication provider, eg. `sinuna`
- `event=login`: intent of the request, with a login situation its always `login`

eg: `https://${frontendAppHost}/login-handler.html?success=false&message=Authentication+failed&type=info&provider=sinuna&intent=login`

## LoginRequest

The received `loginCode` is a temporary code which is used in retrieving the actual login state from the `/auth/openid/sinuna/login-request`-endpoint.

```js
const response = await fetch(`https://${authEndpointHost}/auth/openid/sinuna/login-request`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    loginCode: loginCode,
    appContext: appContext, // url-encoded base64 string
  }),
});
const { idToken, profileData } = await response.json();
```

The retrieved data:

- idToken: a JWT token that can be used to authenticate the user in the backend
- profileData: a JSON object containing the user profile data

Store the token in the browser's local storage.

eg.

```js
localStorage.setItem(`idToken_sinuna`, idToken);
```

## Using the auth token

Requests to the protected external backend services are accompanied with the `idToken` as a bearer token in the `Authorization` header.

eg:

```js
fetch(`https://data-product-endpoint.example`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  },
});
```

If the endpoint need authorization and the request fails with a `401` status code, the token is expired and the user should be redirected to the login page.

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

- `success=false`, string-boolean, `false` if login fails, `true` on success
- `message`: the error message
- `type`: message type, one of `danger`, `warning`, `info`
- `provider`: authentication provider, eg. `sinuna`
- `event=logout`: intent of the request, with a logout situation its always `logout`

eg: `https://${frontendAppHost}/login-handler.html?success=false&message=Logout+failed&type=info&provider=sinuna&intent=event`
