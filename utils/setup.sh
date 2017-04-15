#!/bin/bash

rm -rf ./venv/
python3 -m venv venv
venv/bin/pip3 install -r requirements.txt
utils/db_init.sh
utils/db_migrate.sh
utils/db_upgrade.sh
