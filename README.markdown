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
	
			docker-compose up -d

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

* Install a web server to provide SSL and proxy to our Node application, such as [Nginx](http://nginx.org)

		yum install nginx

* Create a configuration file, /etc/nginx/conf.d/dewy.conf, and upload certificate files to /etc/nginx/ssl/:

		server {
		  listen       443 ssl;
		  server_name  api.dewy.io;

		  ssl_certificate  /etc/nginx/ssl/api_dewy_io.crt;
		  ssl_certificate_key /etc/nginx/ssl/api_dewy_io.key;

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

		npm install forever -g

* Set the environment to production:

		export NODE_ENV=production

* Run the Dewy API using that process manager

		forever start -a -l ../logs/forever.log -o ../logs/out.log -e ../logs/err.log bin/www
