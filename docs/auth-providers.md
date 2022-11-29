# Authentication providers

The auth gw currently supports openid connect and saml2 -type authentication flows. The auth gw is configured to use the following providers:

## Sinuna

Sinuna is an Openid Connect -type authentication provider with the following endpoints:

- AuthenticationRequest: `/auth/openid/sinuna/authentication-request`
  - gets a `loginCode`.
- LoginRequest: `/auth/openid/sinuna/login-request`
  - uses the `loginCode` to get an access tokens `idToken` and `accessToken`.
  - example response: `{"idToken":"<idToken>", "expiresAt": "2022-10-10T05:52:50.886Z", "profileData": {"email":"..."}}`
    - `idToken` is a JWT token that contains the user's identity information
    - `expiresAt` is an ISO-8601 timestamp string that specifies the token expirity datetime
    - `profileData` is a JSON object that contains the user's profile data
      - example profileData: `{"userId": "bazbar1231231", "email":"John@Doe", "profile": {"inum": "bazbar1231231", "sub": "e2dasdxcasd"}}`
        - `userId`: is the user ID in the Sinuna system
        - `email`: is the user email
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <idToken>`
- LogoutRequest: `/auth/openid/sinuna/logout-request`
  - ends the sinuna login session

The id token can be verified using the public key of the authentication provider. The public key can be fetched from the following endpoints:

- https://login.iam.qa.sinuna.fi/oxauth/.well-known/openid-configuration

## SuomiFi

SuomiFi is an SAML2 -type authentication provider with the following endpoints:

- AuthenticationRequest: `/auth/saml2/suomifi/authentication-request`
  - gets a `loginCode`
- LoginRequest: `/auth/saml2/suomifi/login-request`
  - uses the `loginCode` to get an access tokens `idToken` and `accessToken`.
  - example response: `{"idToken":"<idToken>", "expiresAt": "2022-10-10T05:52:50.886Z", "profileData": {...}}}`
    - `idToken` is a JWT token that contains the user's identity information
    - `expiresAt` is an ISO-8601 timestamp string that specifies the token expirity datetime
    - `profileData` is a JSON object that contains the user's profile data
      - example profileData: `{"userId": "a21sxxasxaxas323", "email": "John@Doe", "context": {"AuthnContextClassRef": "http://ftn.ficora.fi/2017/loa2"}, "profile": {"nameID": "a21sxxasxaxas323", "email":"John@Doe"}}`
        - `userId`: is the user ID in the SuomiFi system
        - `email`: is the user email (if available)
        - `context.AuthnContextClassRef`: the authentication level reference
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <idToken>`
- LogoutRequest: `/auth/saml2/suomifi/logout-request`
  - ends the suomifi login session

The id token can be verified using the public key of the authentication provider. The public key can be fetched from the following endpoint:

- `/auth/saml2/suomifi/.well-known/jwks.json`

## Testbed

Testbed is an Openid Connect -type authentication provider with the following endpoints:

- AuthenticationRequest: `/auth/openid/testbed/authentication-request`
  - gets a `loginCode`.
- LoginRequest: `/auth/openid/testbed/login-request`
  - uses the `loginCode` to get an access tokens: `idToken` and `accessToken`
  - example response: `{"idToken":"<idToken>", "expiresAt": "2022-10-10T05:52:50.886Z", "profileData": {...}}`
    - `idToken` is a JWT token that contains the user's identity information
    - `expiresAt` is an ISO-8601 timestamp string that specifies the token expirity datetime
    - `profileData` is a JSON object that contains the user's profile data
      - example profileData: `{"userId": "1234567890", "email":"John@Doe", "profile": "sub":"1234567890","name":"1234567890"}`
        - `userId`: is the user ID in the Testbed system
        - `email`: is the user testbed-email
- Data requests to external APIs that need to be authorized:
  - `Authorization: Bearer <idToken>`
- LogoutRequest: `/auth/openid/testbed/logout-request`
  - uses the `idToken` to end the testbed login session

The id token can be verified using the public key of the authentication provider. The public key can be fetched from the following endpoints:

- https://login.testbed.fi/.well-known/openid-configuration
