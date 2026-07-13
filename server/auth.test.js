import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth, parseCookies, safeTokenEqual } from './auth.js';

function response() {
    return {
        statusCode: 200,
        headers: {},
        payload: undefined,
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.payload = payload; return this; },
        end() { return this; }
    };
}

test('compares access tokens without exposing their length', () => {
    assert.equal(safeTokenEqual('correct', 'correct'), true);
    assert.equal(safeTokenEqual('wrong', 'correct'), false);
    assert.equal(safeTokenEqual(undefined, 'correct'), false);
});
test('parses cookie headers', () => {
    assert.deepEqual(parseCookies('first=one; gasstrom_session=abc%20123'), {
        first: 'one',
        gasstrom_session: 'abc 123'
    });
});

test('requires login, creates an HttpOnly session and logs out', () => {
    const auth = createAuth({ accessToken: 'correct horse', secureCookie: true });
    const unauthenticated = response();
    auth.middleware({ headers: {} }, unauthenticated, () => assert.fail('must not continue'));
    assert.equal(unauthenticated.statusCode, 401);

    const rejected = response();
    auth.login({ body: { token: 'wrong' } }, rejected);
    assert.equal(rejected.statusCode, 401);

    const accepted = response();
    auth.login({ body: { token: 'correct horse' } }, accepted);
    assert.equal(accepted.payload.authenticated, true);
    assert.match(accepted.headers['Set-Cookie'], /HttpOnly/);
    assert.match(accepted.headers['Set-Cookie'], /Secure/);

    const cookie = accepted.headers['Set-Cookie'].split(';')[0];
    let continued = false;
    auth.middleware({ headers: { cookie } }, response(), () => { continued = true; });
    assert.equal(continued, true);

    const loggedOut = response();
    auth.logout({ headers: { cookie } }, loggedOut);
    assert.equal(loggedOut.statusCode, 204);
    assert.match(loggedOut.headers['Set-Cookie'], /Max-Age=0/);
});
