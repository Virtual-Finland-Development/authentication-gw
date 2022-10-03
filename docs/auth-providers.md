# Authentication providers

The auth gw currently supports openid connect and saml2 -type authentication flows. The auth gw is configured to use the following providers:

## Sinuna

Sinuna is an Openid Connect -type authentication provider with the following endpoints:

- login: `/auth/openid/sinuna/login-request`
- token: `/auth/openid/sinuna/auth-token-request`
- userInfo: `/auth/openid/sinuna/user-info-request`
- logout: `/auth/openid/sinuna/logout-request`

The login flow gets a `loginCode` and uses it to get an access token. The access token is then used to get user info.

## SuomiFi

SuomiFi is an SAML2 -type authentication provider with the following endpoints:

- login: `/auth/saml2/suomifi/login-request`
- userInfo: `/auth/saml2/suomifi/user-info-request`
- logout: `/auth/saml2/suomifi/logout-request`

The login flow gets a `loginCode` which is an user identifier (nameID). The user identifier is then used to get user info.

## Testbed

Testbed is an Openid Connect -type authentication provider with the following endpoints:

- login: `/auth/openid/testbed/login-request`
- token: `/auth/openid/testbed/auth-token-request`
- userInfo: `/auth/openid/testbed/user-info-request`
- logout: `/auth/openid/testbed/logout-request`

The login flow gets a `loginCode` and uses it to get an access token and an id token. The access token is then used to get user info, the id token is used in logging out.
