import { signV5 } from '../../credentials/DuoSecurityApi.credentials';

describe('sigV5', () => {
	it('V5 signature', () => {
		const ikey = 'test_ikey';
		const skey = 'test_skey';
		const method = 'POST';
		const host = 'test.duosecurity.com';
		const path = '/test/v1';
		const params = {};
		const date = 'Tue, 21 Aug 2012 17:29:18 -0000';
		const exp_sig =
			'Basic dGVzdF9pa2V5OjdkMDI0MDlhMTUyNzY0ODQzY2NjZDgyODRkYTE1M2IzZmI0NDZiYWFkNWY5OTg4ODYzMjVlMjRiYzljZDRhMjQ0ZGU4NWFkNGJmYTdlYTI4NWQ2ODIwOWYxNjA4MzU2NzNkOGI0ZjFlMWIyM2Q5Y2Q1MjFkMjZiZmU3ZjM2NmE0';

		const obj = {
			realname: 'First Last',
			username: 'root',
		};

		const body = JSON.stringify(obj);
		const auth = signV5(ikey, skey, method, host, path, params, date, body);

		expect(auth).toEqual(exp_sig);
	});
});
