# Authentication providers

The auth gw currently supports openid connect and saml2 -type authentication flows. The auth gw is configured to use the following providers:

## Sinuna

Sinuna is an Openid Connect -type authentication provider with the following endpoints:

- LoginRequest: `/auth/openid/sinuna/login-request`
  - gets a `loginCode`.
- AuthTokenRequest: `/auth/openid/sinuna/auth-token-request`
  - uses the `loginCode` to get an access tokens `idToken` and `accessToken`.
  - example response: `{"idToken":"<idToken>","accessToken":"<accessToken>", "expiresAt": 123123133}`
    - `idToken` is a JWT token that contains the user's identity information
    - `accessToken` is a permit to get the authentication provider specific data and details using the UserInfoRequest-endpoint
    - `expiresAt` is an unix timestamp number that parses into a datetime when the tokens expires
- UserInfoRequest: `/auth/openid/sinuna/user-info-request`
  - uses the `accessToken` to get user info
  - example response: `{"inum": "bazbar1231231", "sub":"1234567890","email":"John@Doe"}`
    - `inum`: is the user ID in the Sinuna system
    - `email`: is the user email
    - `sub` _(disrecard)_: is the sinuna service-account specific user ID
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <accessToken>`
  - `X-authorization-provider: sinuna`
- LogoutRequest: `/auth/openid/sinuna/logout-request`
  - ends the sinuna login session

## SuomiFi

SuomiFi is an SAML2 -type authentication provider with the following endpoints:

- LoginRequest: `/auth/saml2/suomifi/login-request`
  - gets a `loginCode`
- AuthTokenRequest: `/auth/saml2/suomifi/auth-token-request`
  - uses the `loginCode` to get an access tokens `idToken` and `accessToken`.
  - example response: `{"idToken":"<idToken>","accessToken":"<accessToken>", "expiresAt": 123123133}`
    - `idToken` is a JWT token that contains the user's identity information
    - `accessToken` is a permit to get the authentication provider specific data and details using the UserInfoRequest-endpoint
    - `expiresAt` is an unix timestamp number that parses into a datetime when the tokens expires
- UserInfoRequest: `/auth/saml2/suomifi/user-info-request`
  - uses the `accessToken` to get user info
  - example response: `{"context": {"AuthnContextClassRef": "http://ftn.ficora.fi/2017/loa2"}, "profile": {"nameID": "a21sxxasxaxas323", "email":"John@Doe"}, "accessToken": jwt.233höpölöpöasd.32313cc}`
    - `context.AuthnContextClassRef`: is the authentication level information
    - `profile.nameID`: is the user ID in the SuomiFi system
    - `profile.email`: is the user email (if available)
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <idToken>`
  - `X-authorization-provider: suomifi`
- LogoutRequest: `/auth/saml2/suomifi/logout-request`
  - ends the suomifi login session

## Testbed

Testbed is an Openid Connect -type authentication provider with the following endpoints:

- LoginRequest: `/auth/openid/testbed/login-request`
  - gets a `loginCode`.
- AuthTokenRequest: `/auth/openid/testbed/auth-token-request`
  - uses the `loginCode` to get an access tokens: `idToken` and `accessToken`
  - example response: `{"idToken":"<idToken>","accessToken":"<accessToken>", "expiresAt": 123123133}`
    - `idToken` is a JWT token that contains the user's identity information
    - `accessToken` is a permit to get the authentication provider specific data and details using the UserInfoRequest-endpoint
    - `expiresAt` is an unix timestamp number that parses into a datetime when the tokens expires
- UserInfoRequest: `/auth/openid/testbed/user-info-request`
  - uses the `accessToken` to get user info
  - example response: `{"sub":"1234567890","name":"1234567890"}`
    - `sub`: is the user ID in the Testbed system
    - `name` _(disrecard)_: is the user name, but not currently available
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <idToken>`
  - `X-authorization-provider: testbed`
- LogoutRequest: `/auth/openid/testbed/logout-request`
  - uses the `idToken` to end the testbed login session
