#!/usr/bin/env python

from flask import Flask

from sites import sites
from modules import modules
from nodes import nodes

import oauth

def main():
	app = Flask(__name__)
	oauth.oauth.init_app(app)

	app.register_blueprint(oauth.blueprint, url_prefix='/oauth')

	app.register_blueprint(sites, url_prefix='/sites')
	app.register_blueprint(modules, url_prefix='/modules')
	app.register_blueprint(nodes, url_prefix='/nodes')

	app.run(
		host='0.0.0.0',
		port=8080
	)


if __name__ == '__main__':
	main()
