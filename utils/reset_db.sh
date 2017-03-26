#!/bin/bash

rm dev.db
rm -r migrations

utils/db_init.sh
utils/db_migrate.sh
utils/db_upgrade.sh
