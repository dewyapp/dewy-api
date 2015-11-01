from flask import Blueprint
from . import base

modules = Blueprint('modules', __name__)
modules.add_url_rule('/', 'modules', base.modules)
modules.add_url_rule('/<modules>', 'module', base.module)
