#!/usr/bin/env bash
# @see: https://ruleoftech.com/2020/generating-jwt-and-jwk-for-information-exchange-between-services

if [ -f suomifi_jwt_private.pem ]; then
    echo "Private key already exists"
    exit 0
fi
if [ -f suomifi_jwt_public.pem ]; then
    echo "Public key already exists"
    exit 0
fi
echo "> Generate key pair"
openssl genrsa -out suomifi_jwt_private.pem 4096
openssl rsa -in suomifi_jwt_private.pem -out suomifi_jwt_public.pem -pubout

echo "> Generate certificate"
openssl req -key suomifi_jwt_private.pem -new -x509 -days 3650 -subj "/C=FI/ST=Helsinki/O=Virtual Finland Development/OU=Information unit/CN=vfd." -out suomifi_jwt_cert.pem

echo "> Convert public key to JWK format"
npm install -g pem-jwk
ssh-keygen -e -m pkcs8 -f suomifi_jwt_private.pem | pem-jwk | jq '{kid: "vfd:authgw:suomifi:jwt", alg: "RS256", kty: .kty , use: "sig", n: .n , e: .e }' > suomifi_jwt.jwk

echo "> Keys created"

echo "Output files:"
echo "Public key:                suomifi_jwt_public.pem"
echo "Private key:               suomifi_jwt_private.pem"
echo "Certificate:               suomifi_jwt_cert.pem"
echo "JWKS:                      suomifi_jwt.jwk"
echo