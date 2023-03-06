#!/usr/bin/env bash
#echo "Create keys for different live environments"

./create_testbed_jwtRS256.sh local
./create_testbed_jwtRS256.sh dev
./create_testbed_jwtRS256.sh staging

echo "Create jwks-file"

cat > testbed_jwks.json << EOF
{
    "keys": [
        $(cat local_testbed_jwt.jwk),
        $(cat dev_testbed_jwt.jwk),
        $(cat staging_testbed_jwt.jwk)
    ]
}
EOF
PRETTY_OUT=$(jq . testbed_jwks.json)
echo $PRETTY_OUT > testbed_jwks.json

echo "Create testbed party config"
TESTBED_HOST="https://virtual-finland-development-auth-files.s3.eu-north-1.amazonaws.com"

cat > testbed_party_config.json << EOF
{
    "jwks_uri": "${TESTBED_HOST}/.well-known/jwks.json"
}
EOF

PRETTY_OUT=$(jq . testbed_party_config.json)
echo $PRETTY_OUT > testbed_party_config.json
