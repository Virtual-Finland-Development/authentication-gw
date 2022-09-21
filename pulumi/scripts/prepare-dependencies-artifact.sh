#!/usr/bin/env bash

set -o errexit

PROJECT_ROOT_DIR="$( realpath $( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../../ )"
PULUMI_ROOT_DIR="${PROJECT_ROOT_DIR}/pulumi/"
ARCHIVES_ROOT_DIR="${PULUMI_ROOT_DIR}/.lambda/layers/"

# Prep
mkdir -p ${ARCHIVES_ROOT_DIR}
cp ${PROJECT_ROOT_DIR}/package.json ${ARCHIVES_ROOT_DIR}/package.json
cp ${PROJECT_ROOT_DIR}/package-lock.json ${ARCHIVES_ROOT_DIR}/package-lock.json

# Install
cd $ARCHIVES_ROOT_DIR
npm ci --omit=dev
cd $PROJECT_ROOT_DIR