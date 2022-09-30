# Authentication providers

The auth gw currently supports openid connect and saml2 -type authentication flows. The auth gw is configured to use the following providers:

## Sinuna

Sinuna is an Openid Connect -type authentication provider with the following endpoints:

- login: `/auth/openid/login-request`
- token: `/auth/openid/auth-token-request`
- userInfo: `/auth/openid/user-info-request`
- logout: `/auth/openid/logout-request`

The login flow gets a `loginCode` and uses it to get an access token. The access token is then used to get user info.

## SuomiFi

SuomiFi is an SAML2 -type authentication provider with the following endpoints:

- login: `/auth/saml2/login-request`
- userInfo: `/auth/saml2/user-info-request`
- logout: `/auth/saml2/logout-request`

The login flow gets a `loginCode` which is an user identifier (nameID). The user identifier is then used to get user info.
