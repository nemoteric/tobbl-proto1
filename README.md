# tobbl 
A discussion site that offers a novel approach to collaborative problem solving.

Python version 3.5.2

## Utility scripts:
* [setup.sh] - install virtual env, install pip modules, initiate db, migrate, upgrade
* [commit.sh] - adds new files and removes database specific files; must be given commit message
* [launch.sh] - host server on localhost:5000
* [launch_detached.sh] - host server in detached thread
* [kill_detached.sh] - kills all detached threads
* [reset.sh] - resets sqlite database and neo4j database
each should be run from root directory: e.g. `$ utils/setup.sh`

## Current functionality:
* User login and registration
    + no email authentication system
* Thread function
    + create threads
    + make choices
    + respond to choices with support or challenge
    + respond to responses with support or challenge
    + all clicks are weighted with proprietary formula
    
## Setup
* Neo4j
    + Install community edition
    + Start Neo4j and set a default path
    + Navigate to localhost:7474 to set username and password
    + Add the following to ~/.bash_profile`
    export NEO4J_PASSWORD='<neo4j_password>'
    export NEO4J_USERNAME='<neo4j_username>'
    export NEO4J_PATH="/Users/<your_username>/<your_neo4j_path>/neo4j/"`
* tobbl
    + Run `$ utils/setup.sh` to install
    + Run `$ utils/launch.sh` to start server
    

## Dev notes:
* To commit all changes except the database-specific files, run `utils/commit.sh "Commit message"`
* built with blueprints for each major branch of the code (auth, main, etc.) 
* when new models are added to models.py, they must also be imported into and listed in run.py
* all manual python calls should use venv/bin/python3 and venv/bin/pip3

