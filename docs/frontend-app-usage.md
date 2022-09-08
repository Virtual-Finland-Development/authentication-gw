# Frontent app usage

Requests to the backend are accompanied with an `appContext` token which is a base64 encoded string of the following JSON object:

```json
{
  "appName": "app-name",
  "redirectUrl": "url-back-to-the-login-handler-in-the-app"
}
```

eg.

```js
btoa(JSON.stringify({ appName: "TMT-test", redirectUrl: "url-to-the-login-handler-in-the-app" }));
```

> eyJhcHBOYW1lIjoiYXBwLW5hbWUiLCJyZWRpcmVjdFVybCI6InVybC1iYWNrLXRvLXRoZS1sb2dpbi1oYW5kbGVyLWluLXRoZS1hcHAifQ==

## LoginRequest

Redirect user to the `/auth/openid/login-request`-endpoint with the `appContext` token as a query parameter:

```js
window.location.href = `https://${endpointHost}/auth/openid/login-request?appContext=${appContext}`;
```

## LoginResponse

After the auth process is done, the user is redirected to the `redirectUrl` predefined in the `appContext`-variable with a `loginCode` token as a query parameter.

User is redirected to eg: `https://${frontendAppHost}/login-handler.html?code={loginCode}`

## AuthTokenRequest

The received `loginCode` is a temporary code which is used in retrieving the actual auth token from the `/auth/openid/auth-token-request`-endpoint.

```js
const response = await fetch(`https://${endpointHost}/auth/openid/auth-token-request`, {
  method: "POST",
  headres: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    loginCode: loginCode,
  }),
});

const { token } = await response.json();
```

Store the token in the browser's local storage.

eg.

```js
localStorage.setItem("authToken", token);
```
