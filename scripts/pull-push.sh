#!/bin/sh

# Pulls and pushes the current git branch.
# Use it to quickly switch driver in a remote mob or randori

export CURRENT_BRANCH=$(git symbolic-ref --short -q HEAD)

git pull origin "$CURRENT_BRANCH"
git add --all -- ':!src/environments/environment.ts' ':!variables.env.ts' ':!capacitor.config.json'
git commit -m 'Working...'
git push origin "$CURRENT_BRANCH"
