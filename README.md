# Authentication GW

An autentication flow service

[![Build, Test, Deploy](https://github.com/Virtual-Finland-Development/authentication-gw/actions/workflows/build-test-deploy.yml/badge.svg)](https://github.com/Virtual-Finland-Development/authentication-gw/actions/workflows/build-test-deploy.yml)

[![Open in Remote - Containers](https://img.shields.io/static/v1?label=Remote%20-%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/Virtual-Finland-Development/authentication-gw)

## Description

Authentication GW is a service that implements the OpenID Connect Authorization part between the browser client and the authentication provider service.

![./docs/auth-flow-get-token.png](./docs/auth-flow-get-token.png)

_Figure: The login requests flow_

## Development

The development setup can be set up using vscode devcontainers or with local tools

### Run with vscode devcontainer

Read more of the vscode devcontainers here: https://code.visualstudio.com/docs/remote/containers

- Open the project folder as devcontainer
- In the container, start development with a terminal command `npm run start`

### Run with local tools

- `npm install`
- `npm run start`

## Usage

- Swagger docs: http://localhost:3000/docs/

- Documentation for using the service in frontend apps: [./docs/frontend-app-usage.md](docs/frontend-app-usage.md)

## References

- https://developer.sinuna.fi/integration_documentation/
- https://swagger.io/docs/specification/about/
- https://github.com/anttiviljami/openapi-backend
- https://github.com/sylwit/aws-serverless-swagger-ui
