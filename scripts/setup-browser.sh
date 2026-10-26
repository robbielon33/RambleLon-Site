#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export npm_config_cache="${npm_config_cache:-/tmp/ramblelon-npm}"
export CYPRESS_CACHE_FOLDER="$PWD/.cache/Cypress"
export XDG_CONFIG_HOME="$PWD/.cache/config"
export XDG_CACHE_HOME="$PWD/.cache"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME"
if ! command -v Xvfb >/dev/null 2>&1 && [ ! -x .tools/xvfb/usr/bin/Xvfb ]; then
  setup_tmp=$(mktemp -d /tmp/ramblelon-browser.XXXXXX)
  mkdir -p "$setup_tmp/lists/partial" "$setup_tmp/empty" .tools/xvfb
  printf '%s\n' 'deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main' > "$setup_tmp/sources.list"
  apt-get -o Dir::Etc::Parts="$setup_tmp/empty" -o Dir::Etc::sourcelist="$setup_tmp/sources.list" -o Dir::Etc::sourceparts="$setup_tmp/empty" -o Dir::State::lists="$setup_tmp/lists" -o Dir::Cache="$setup_tmp/cache" update
  project_dir=$PWD
  (cd "$setup_tmp" && apt-get -o Dir::Etc::Parts="$setup_tmp/empty" -o Dir::Etc::sourcelist="$setup_tmp/sources.list" -o Dir::Etc::sourceparts="$setup_tmp/empty" -o Dir::State::lists="$setup_tmp/lists" download xvfb)
  for archive in "$setup_tmp"/*.deb; do dpkg-deb -x "$archive" "$project_dir/.tools/xvfb"; done
  rm -r "$setup_tmp"
fi
npx cypress install
version=$(node -p "require('./node_modules/cypress/package.json').version")
if [ ! -x "$CYPRESS_CACHE_FOLDER/$version/Cypress/Cypress" ]; then
  echo 'Cypress browser binary missing. Allow download.cypress.io and cdn.cypress.io in environment settings, then rerun this script.' >&2
  exit 1
fi
PATH="$PWD/.tools/xvfb/usr/bin:$PATH" npx cypress verify
