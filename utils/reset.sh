#!/bin/bash

utils/reset_db.sh
venv/bin/python3 utils/reset_neo4j.py
