import { configuredOutputs, getResponseCode, getResponseData } from '../utils/response';
import { isIpAllowed } from '../utils/webhook';

describe('REST API webhook helpers', () => {
	it.each([
		[undefined, [], '203.0.113.5', true],
		['203.0.113.5', [], '203.0.113.5', true],
		['203.0.113.0/24', [], '203.0.113.42', true],
		['2001:db8::/32', [], '2001:db8::5', true],
		['127.0.0.1', [], '::ffff:127.0.0.1', true],
		['10.0.0.0/8', ['10.2.3.4'], '203.0.113.5', true],
		['invalid, 192.0.2.1', [], '203.0.113.5', false],
		['192.0.2.0/24', [], '203.0.113.5', false],
	] as const)('checks an IP allowlist', (allowlist, proxyIps, requestIp, expected) => {
		expect(isIpAllowed(allowlist, [...proxyIps], requestIp)).toBe(expected);
	});

	it('creates one named output for every configured HTTP method', () => {
		expect(
			configuredOutputs({
				httpMethod: ['GET', 'POST'],
				responseMode: 'onReceived',
			}),
		).toEqual([
			{ type: 'main', displayName: 'GET' },
			{ type: 'main', displayName: 'POST' },
		]);
	});

	it('resolves Webhook-compatible response settings', () => {
		const parameters = {
			httpMethod: 'POST',
			responseMode: 'onReceived',
			options: { responseCode: 202, responseData: 'accepted' },
		};

		expect(getResponseCode(parameters)).toBe(202);
		expect(getResponseData(parameters)).toBe('accepted');
	});
});
