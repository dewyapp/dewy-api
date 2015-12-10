from flask import Blueprint

blueprint = Blueprint('nodes', __name__)

@blueprint.route('/')
def nodes():
	return 'Nodes in the current context.'

@blueprint.route('/<node>', methods=['GET', 'POST'])
def node(node):
	return 'Node %s in the current context.' % node
