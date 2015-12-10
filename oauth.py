from datetime import datetime, timedelta

from couchbase.bucket import Bucket
from flask import Blueprint
from flask import session, request
from flask_oauthlib.provider import OAuth2Provider

# Based on https://github.com/lepture/example-oauth2-server/blob/master/app.py

oauth = OAuth2Provider()
blueprint = Blueprint('oauth', __name__)
accounts_db = Bucket('couchbase://192.168.99.100/dewy_auth')

def current_user():
	if 'id' in session:
		return session['id']
	return None 

@oauth.clientgetter
def load_client(client_id):
	return accounts_db.get(client_id)

@oauth.grantgetter
def load_grant(client_id, code):
	return accounts_db.get('%s/grant/%s' % (client_id, code))

@oauth.grantsetter
def save_grant(client_id, code, request, *args, **kwargs):
	expires = datetime.utcnow() + timedelta(seconds=100)
	grant = {
		'client_id': client_id,
		'code': code['code'],
		'redirect_uri': request.redirect_uri,
		'scopes': ' '.join(request.scopes),
		'user': current_user(),
		'expires': 'expires'
	}
	accounts_db.insert('%s/grant/%s' % (client_id, code['code']), grant)
	return grant

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

