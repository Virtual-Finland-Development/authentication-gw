#!/usr/bin/env bash
if [ -f suomifi_jwt_private.pem ]; then
    echo "Private key already exists"
    exit 0
fi
if [ -f suomifi_jwt_public.pem ]; then
    echo "Public key already exists"
    exit 0
fi

openssl genrsa -out suomifi_jwt_private.pem 2048
openssl rsa -in suomifi_jwt_private.pem -pubout -out suomifi_jwt_public.pem

echo "Keys created"