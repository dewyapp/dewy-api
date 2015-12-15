from flask import Blueprint

blueprint = Blueprint('modules', __name__)

@blueprint.route('/')
def modules():
	return 'Modules in the current context.'

@blueprint.route('/<module>', methods=['GET', 'POST'])
def module(module):
	return 'Module %s in the current context.' % module
