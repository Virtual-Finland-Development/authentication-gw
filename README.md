# Authentication GW

An autentication flow service

[![Build, Test, Deploy](https://github.com/Virtual-Finland-Development/authentication-gw/actions/workflows/build-test-deploy.yml/badge.svg)](https://github.com/Virtual-Finland-Development/authentication-gw/actions/workflows/build-test-deploy.yml)

## Description

Authentication GW is a service that implements the OpenID Connect Authorization part between the browser client and the authentication provider service.

![./docs/auth-flow-get-token.png](./docs/auth-flow-get-token.png)

_Figure: The login requests flow_

## Install

`npm install`

## Usage

`npm run start`

- Swagger docs: http://localhost:3000/docs/

- Documentation for using the service in frontend apps: [./docs/frontend-app-usage.md](docs/frontend-app-usage.md)

## References

- https://developer.sinuna.fi/integration_documentation/
- https://swagger.io/docs/specification/about/
- https://github.com/anttiviljami/openapi-backend
- https://github.com/sylwit/aws-serverless-swagger-ui
