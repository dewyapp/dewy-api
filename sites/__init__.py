from flask import Blueprint
from . import base, modules

sites = Blueprint('sites', __name__)
sites.add_url_rule('/', 'sites', base.sites)
sites.add_url_rule('/<site>', 'site', base.site)
sites.add_url_rule('/<site>/modules', 'modules', modules.modules)
sites.add_url_rule('/<site>/modules/<module>', 'module', modules.module)
