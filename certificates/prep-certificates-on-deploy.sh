#!/usr/bin/env bash

OUTFILE=virtual_finland_development.key

cd `dirname "$0"` 
if [ -f "${OUTFILE}" ]; then
    echo "$PROG: File already exists: \"${OUTFILE}\"." >&2
    exit 1
fi
umask 0077
echo ${SUOMIFI_PRIVATE_KEY} > ${OUTFILE}