from flask import Blueprint
from . import base

sites = Blueprint('sites', __name__)
sites.add_url_rule('/', 'sites', base.sites)
sites.add_url_rule('/<site>', 'site', base.site)
