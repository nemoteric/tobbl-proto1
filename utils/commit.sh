#!/bin/bash

## remove all __pycache__ files
find . | grep -E "(__pycache__|\.pyc|\.pyo$)" | xargs rm -rf

git add *
git rm -rf --cached migrations
git rm -rf --cached venv
git rm -f --cached dev.db
git commit -m "$1"