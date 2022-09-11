#!/usr/bin/env bash
echo "DEBUG: $AUTH_PROVIDER_REDIRECT_BACK_HOST"
ls -la ./web/index.html
sed -i "s/authAPIHost: \"\",/authAPIHost: \"${AUTH_PROVIDER_REDIRECT_BACK_HOST}\",/g" ./web/index.html