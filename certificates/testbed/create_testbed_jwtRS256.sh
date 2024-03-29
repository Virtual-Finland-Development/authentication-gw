#!/usr/bin/env bash
# @see: https://ruleoftech.com/2020/generating-jwt-and-jwk-for-information-exchange-between-services

STAGE="${1:-dev}"

if [ -f ${STAGE}_testbed_jwt_private.pem ] || [ -f ${STAGE}_testbed_jwt_public.pem ]; then
    echo "> Skipping ${STAGE}, keys already exists"
else
    echo "> Generate key pair"
    openssl genrsa -out ${STAGE}_testbed_jwt_private.pem 4096
    openssl rsa -in ${STAGE}_testbed_jwt_private.pem -out ${STAGE}_testbed_jwt_public.pem -pubout

    echo "> Generate certificate"
    openssl req -key ${STAGE}_testbed_jwt_private.pem -new -x509 -days 3650 -subj "/C=FI/ST=Helsinki/O=Virtual Finland Development/OU=Information unit/CN=vfd." -out ${STAGE}_testbed_jwt_cert.pem

    echo "> Convert public key to JWK format"
    npm install -g pem-jwk
    ssh-keygen -e -m pkcs8 -f ${STAGE}_testbed_jwt_private.pem | pem-jwk | jq '{kid: "vfd:authgw:'${STAGE}':testbed:jwt", alg: "RS256", kty: .kty , use: "sig", n: .n , e: .e }' > ${STAGE}_testbed_jwt.jwk

    echo "> Keys created"

    echo "Output files:"
    echo "Public key:                ${STAGE}_testbed_jwt_public.pem"
    echo "Private key:               ${STAGE}_testbed_jwt_private.pem"
    echo "Certificate:               ${STAGE}_testbed_jwt_cert.pem"
    echo "JWKS:                      ${STAGE}_testbed_jwt.jwk"
    echo
fi