from datetime import datetime, timedelta

from couchbase.bucket import Bucket
from flask import Blueprint
from flask import session, request
from flask_oauthlib.provider import OAuth2Provider

# Based on https://github.com/lepture/example-oauth2-server/blob/master/app.py

oauth = OAuth2Provider()
blueprint = Blueprint('oauth', __name__)
auth_db = Bucket('couchbase://192.168.99.100/dewy_auth')


class Document(object):

	def __init__(self, doc):
		self._doc = doc

	def __getattr__(self, name):
		if name in self._doc:
			return self._doc.get(name)
		raise AttributeError('No attribute named %s' % name)


class Grant(Document):

	@property
	def user(self):
		key = 'u/%s' % self._doc.get('user_id')
		user = None

		try:
			res = auth_db.get(key)
			user = Document(res.value)
		except:
			pass

		return user


def current_user():
	if 'id' in session:
		return session['id']
	return None 

@oauth.clientgetter
def load_client(client_id):
	# Load a client document from auth_db. The document key
	# is client_id prefixed with 'c/'.
	key = 'c/%s' % client_id
	client = None

	try:
		res = auth_db.get(key)
		client = Document(res.value)
	except:
		pass

	return client

@oauth.grantgetter
def load_grant(client_id, code):
	# Load a grant token for a client from auth_db. The
	# document key is 'c/{client_id}/g/{code}'
	key = 'c/%s/g/%s' % (client_id, code)
	grant = None

	try:
		res = auth_db.get(key)
		grant = Grant(res.value)
	except:
		pass

	return grant

@oauth.grantsetter
def save_grant(client_id, code, request, *args, **kwargs):
	key = 'c/%s/g/%s' % (client_id, code['code'])
	ttl = 600
	grant = {
		'client_id': client_id,
		'user_id': session['id'],
		'code': code['code'],
		'redirect_uri': request.redirect_uri,
		'scopes': request.scopes
	}

	try:
		res = auth_db.insert(key, grant, ttl=ttl)
		grant = Document(res.value)
	except:
		grant = None

	return grant

@oauth.tokengetter
def load_token(access_token=None, refresh_token=None):
	key = 'u/%s/c/%s/t/%s' % (request.user.id, request.client.client_id, access_token or refresh_token)
	token = None

	try:
		res = auth_db.get(key)
		token = Document(res.value)
	except:
		pass

	return token

@oauth.tokensetter
def save_token(token, request, *args, **kwargs):
	key = 'u/%s/c/%s/t/%s' % (request.user.id, request.client.client_id, token['access_token'] or token['refresh_token'])
	ttl = 600
	token = {
		'access_token': token['access_token'],
		'refresh_token': token['refresh_token'],
		'token_type': token['token_type'],
		'scopes': [token['scope']],
		'expires': None,
		'client_id': request.client.client_id,
		'user_id': request.user.id
	}

	try:
		res = auth_db.insert(key, token, ttl=ttl)
		token = Document(res.value)
	except:
		token = None

	print ':save_token'
	return token

@blueprint.route('/token', methods=['GET', 'POST'])
@oauth.token_handler
def access_token():
	return None

@blueprint.route('/authorize', methods=['GET', 'POST'])
@oauth.authorize_handler
def authorize(*args, **kwargs):
	user = current_user()
	if not user:
		session['id'] = 'client1'
	return True


@blueprint.route('/me')
@oauth.require_oauth()
def me():
	pass

