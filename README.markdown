![Dewy](dewy.png "Dewy")

# Dewy API

## Installation

* Install Couchbase via Docker for Mac:

	1. [Download and install Docker](https://docs.docker.com/docker-for-mac/)
	2. Start Docker by running Docker.app
	3. Bring up Couchbase server through Docker
	
			$ docker-compose up -d

	4. Visit the Couchbase Console at http://<docker-machine-ip>/index.html, and set up the server with a username and password, then delete the default bucket and add a Dewy bucket with a password

* Configure Couchbase, Mailgun and OAuth:

        $ cp config.json.default config.json

* Install dependencies:

		$ npm install

## Usage

### Running the API in development

* Run node:

		$ npm start

* Make requests to the API at localhost:3001 (or whatever port number configured in config.json)

### Running the API in production

* Install a web server to provide SSL and proxy to our Node application, such as [Nginx](http://nginx.org)

		$ yum install nginx

* Create a configuration file, /etc/nginx/conf.d/dewy.conf, and upload certificate files to /etc/nginx/ssl/:

		server {
		  listen       443 ssl;
		  server_name  api.dewy.io;

		  ssl_protocols TLSv1.2 TLSv1.1 TLSv1;
		  ssl_certificate  /etc/nginx/ssl/api_dewy_io.crt;
		  ssl_certificate_key /etc/nginx/ssl/api_dewy_io.key;

		  location /site {
		    rewrite /site /1.0/sites;
		  }

		  location /1.0/ {
		    rewrite ^/1.0(/.*)$ $1 break;
		    proxy_pass http://localhost:3001;
		    proxy_http_version 1.1;
		    proxy_set_header Upgrade $http_upgrade;
		    proxy_set_header Connection 'upgrade';
		    proxy_set_header Host $host;
		    proxy_cache_bypass $http_upgrade;
		  }
		}

* Install a [process manager for Node](http://expressjs.com/en/advanced/pm.html)

		$ npm install forever -g

* Run the Dewy API using that process manager

		$ forever start -a -l ../logs/forever.log -o ../logs/out.log -e ../logs/err.log api.js

### Command line tools

* Administrative functions can be run through the command line, access the help for more details:

		$ ./api.js -h

### Processes

* There are three processes that must be run for Dewy to function properly as a service:

	1. Pulling site data from sites registered with Dewy
	
		This should be run daily
		
			0 0 * * * ./api.js audit-all
	
	2. Pulling Drupal.org release data
	
		This should be run every 30 minutes:
		
			*/30 * * * * ./api.js releases
	
	3. Sending notifications around users expiring/expired subscriptions
	
		This should be run hourly:
		
			0 * * * * ./api.js notify-users
