#!/bin/sh
cd "$(dirname "$0")"
node_modules/.bin/next build > build-out.log 2>&1
echo "EXIT=$?"
