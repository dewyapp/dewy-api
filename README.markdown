![Dewy](dewy.png "Dewy")

# Dewy API

## Installation

* Install Couchbase via Docker (OS X)

	1. [Download and install Docker toolbox](https://docs.docker.com/mac/step_one/)
	2. Start Docker machine
	
			docker-machine start
			
	3. Share Docker machine environment variables with your terminal
	
			eval $(docker-machine env default)
			
	4. Bring up Couchbase server through Docker
	
			docker-compose up

	5. Visit the Couchbase Console at http://<docker-machine-ip>/index.html, and set up the server with a username and password

* Configure Couchbase, Mailgun and OAuth:

        cp config.json.default config.json

* Install dependencies:

		npm install

## Usage

* Run node:

		npm start

* Make requests to the API at localhost:3001