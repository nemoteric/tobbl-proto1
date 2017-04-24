#!/bin/bash

venv/bin/pip3 install $1
venv/bin/pip3 freeze > requirements.txt