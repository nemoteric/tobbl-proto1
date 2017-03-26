#!/bin/bash

git add *
git rm -rf --cached migrations
git rm -rf --cached venv
git rm -f --cached dev.db
git commit -m "$1"