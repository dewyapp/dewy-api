from flask import Blueprint

blueprint = Blueprint('sites', __name__)

@blueprint.route('/')
def sites():
	return 'Sites in the current context.'

@blueprint.route('/<site>', methods=['GET', 'POST'])
def site(site):
	return 'Site %s in the current context.' % site

@blueprint.route('/<site>/modules')
def modules(site):
	return 'Modules in the current context.'

@blueprint.route('/<site>/modules/<module>', methods=['GET', 'POST'])
def module(site, module):
	return 'Module %s in the current context.' % module
