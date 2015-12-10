#!/usr/bin/env python

from flask import Flask

import oauth
import modules, nodes, sites

def main():
	app = Flask(__name__)
	oauth.oauth.init_app(app)

	app.register_blueprint(oauth.blueprint, url_prefix='/oauth')

	app.register_blueprint(modules.blueprint, url_prefix='/modules')
	app.register_blueprint(nodes.blueprint, url_prefix='/nodes')
	app.register_blueprint(sites.blueprint, url_prefix='/sites')

	app.run(
		host='0.0.0.0',
		port=8080
	)


if __name__ == '__main__':
	main()
