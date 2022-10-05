# Authentication providers

The auth gw currently supports openid connect and saml2 -type authentication flows. The auth gw is configured to use the following providers:

## Sinuna

Sinuna is an Openid Connect -type authentication provider with the following endpoints:

- LoginRequest: `/auth/openid/sinuna/login-request`
  - gets a `loginCode`.
- AuthTokenRequest: `/auth/openid/sinuna/auth-token-request`
  - uses the `loginCode` to get an access token: `token`
- UserInfoRequest: `/auth/openid/sinuna/user-info-request`
  - uses the `token` to get user info
  - example: `{"inum": "bazbar1231231", "sub":"1234567890","email":"John@Doe"}`
    - `inum`: is the user ID
    - `email`: is the user email
    - `sub` _(disrecard)_: is the sinuna service-account specific user ID
- LogoutRequest: `/auth/openid/sinuna/logout-request`
  - ends the sinuna login session

## SuomiFi

SuomiFi is an SAML2 -type authentication provider with the following endpoints:

- LoginRequest: `/auth/saml2/suomifi/login-request`
  - gets a `loginCode`
- UserInfoRequest: `/auth/saml2/suomifi/user-info-request`
  - uses the `loginCode` to get user info and access token
  - example: `{"context": {"AuthnContextClassRef": "http://ftn.ficora.fi/2017/loa2"}, "profile": {"nameID": "a21sxxasxaxas323", "email":"John@Doe"}, "accessToken": jwt.233höpölöpöasd.32313cc}`
    - `context.AuthnContextClassRef`: is the authentication level information
    - `profile.nameID`: is the user ID
    - `profile.email`: is the user email (if available)
    - `accessToken`: is the access token used for accessing external API resources
- AuthTokenRequest: `/auth/openid/suomifi/auth-token-request`
  - uses the `loginCode` to get an access token: `token` (the same as above accessToken)
- LogoutRequest: `/auth/saml2/suomifi/logout-request`
  - ends the suomifi login session

## Testbed

Testbed is an Openid Connect -type authentication provider with the following endpoints:

- LoginRequest: `/auth/openid/testbed/login-request`
  - gets a `loginCode`.
- AuthTokenRequest: `/auth/openid/testbed/auth-token-request`
  - uses the `loginCode` to get an access token: `token` and `idToken`
- UserInfoRequest: `/auth/openid/testbed/user-info-request`
  - uses the `token` to get user info
  - example: `{"sub":"1234567890","name":"1234567890"}`
    - `sub`: is the testbed user ID
    - `name` _(disrecard)_: is the user name, but not currently available
- LogoutRequest: `/auth/openid/testbed/logout-request`
  - uses the `idToken` to end the testbed login session
