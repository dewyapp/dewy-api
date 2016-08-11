![Dewy](dewy.png "Dewy")

# Dewy API

## Installation

* Install Couchbase via Docker (OS X):

	1. [Download and install Docker toolbox](https://docs.docker.com/mac/step_one/)
	2. Start Docker machine
	
			docker-machine start
			
	3. Share Docker machine environment variables with the terminal
	
			eval $(docker-machine env default)
			
	4. Bring up Couchbase server through Docker
	
			docker-compose up

	5. Visit the Couchbase Console at http://<docker-machine-ip>/index.html, and set up the server with a username and password, then delete the default bucket and add a Dewy bucket with a password

* Configure Couchbase, Mailgun and OAuth:

        cp config.json.default config.json

* Install dependencies:

		npm install

## Usage

### Development

* Run node:

		npm start

* Make requests to the API at localhost:3001

### Production

* Run node, specifying that the environment is production:

		NODE_ENV=production npm start

* Alternatively, if it is preferred to specify the environment outside of the run command, run:

		export NODE_ENV=production
		npm start