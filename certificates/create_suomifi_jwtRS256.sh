#!/usr/bin/env bash
# @see: https://ruleoftech.com/2020/generating-jwt-and-jwk-for-information-exchange-between-services

STAGE="dev"

if [ -f ${STAGE}_suomifi_jwt_private.pem ]; then
    echo "Private key already exists"
    exit 0
fi
if [ -f ${STAGE}_suomifi_jwt_public.pem ]; then
    echo "Public key already exists"
    exit 0
fi
echo "> Generate key pair"
openssl genrsa -out ${STAGE}_suomifi_jwt_private.pem 4096
openssl rsa -in ${STAGE}_suomifi_jwt_private.pem -out ${STAGE}_suomifi_jwt_public.pem -pubout

echo "> Generate certificate"
openssl req -key ${STAGE}_suomifi_jwt_private.pem -new -x509 -days 3650 -subj "/C=FI/ST=Helsinki/O=Virtual Finland Development/OU=Information unit/CN=vfd." -out ${STAGE}_suomifi_jwt_cert.pem

echo "> Convert public key to JWK format"
npm install -g pem-jwk
ssh-keygen -e -m pkcs8 -f ${STAGE}_suomifi_jwt_private.pem | pem-jwk | jq '{kid: "vfd:authgw:suomifi:jwt", alg: "RS256", kty: .kty , use: "sig", n: .n , e: .e }' > ${STAGE}_suomifi_jwt.jwk

echo "> Keys created"

echo "Output files:"
echo "Public key:                ${STAGE}_suomifi_jwt_public.pem"
echo "Private key:               ${STAGE}_suomifi_jwt_private.pem"
echo "Certificate:               ${STAGE}_suomifi_jwt_cert.pem"
echo "JWKS:                      ${STAGE}_suomifi_jwt.jwk"
echo