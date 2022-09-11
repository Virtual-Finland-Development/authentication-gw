#!/usr/bin/env bash
sed -i 's/authAPIHost: "",/authAPIHost: "'${AUTH_PROVIDER_REDIRECT_BACK_HOST}'",/' ./web/index.html