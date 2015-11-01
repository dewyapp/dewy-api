from flask import Blueprint
from . import base

nodes = Blueprint('nodes', __name__)
nodes.add_url_rule('/', 'nodes', base.nodes)
nodes.add_url_rule('/<node>', 'node', base.node)
