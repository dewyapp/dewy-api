from flask import Blueprint
from flask import session, request
from flask_oauthlib.provider import OAuth2Provider

# Based on https://github.com/lepture/example-oauth2-server/blob/master/app.py

oauth = OAuth2Provider()
blueprint = Blueprint('oauth', __name__)

def current_user():
	if 'id' in session:
		return session['id']
	return None 

@oauth.clientgetter
def load_client(client_id):
	pass

@oauth.grantgetter
def load_grant(client_id, code):
	pass

@oauth.grantsetter
def save_grant(client_id, code, request, *args, **kwargs):
	pass

@oauth.tokengetter
def load_token(access_token=None, refresh_token=None):
	pass

@oauth.tokensetter
def save_token(token, request, *args, **kwargs):
	pass

@blueprint.route('/token', methods=['GET', 'POST'])
@oauth.token_handler
def access_token():
	return None

@blueprint.route('/authorize', methods=['GET', 'POST'])
@oauth.authorize_handler
def authorize(*args, **kwargs):
	pass

@blueprint.route('/me')
@oauth.require_oauth()
def me():
	pass

