import type { IExecuteFunctions } from 'n8n-workflow';

import { mapDuoParameters } from '../V1/duoParameterMapping';

function executionContext(values: Record<string, unknown>): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _itemIndex: number, fallbackValue?: unknown) =>
			Object.prototype.hasOwnProperty.call(values, name) ? values[name] : fallbackValue,
	} as unknown as IExecuteFunctions;
}

describe('Duo parameter mapping', () => {
	it('builds an Auth API payload without including UI-only parameters', () => {
		const context = executionContext({
			endpoint: 'auth',
			userIdentifier: { mode: 'username', value: 'alice@example.com' },
			factor: 'push',
			device: 'auto',
			pushinfo: {
				pairs: [
					{ key: 'source', value: 'n8n workflow' },
					{ key: '', value: 'ignored' },
				],
			},
			authOptionalFields: {
				async: true,
				ipaddr: ' 192.0.2.10 ',
				omitted: null,
			},
		});

		expect(mapDuoParameters(context, 0)).toEqual({
			username: 'alice@example.com',
			factor: 'push',
			device: 'auto',
			pushinfo: 'source=n8n%20workflow',
			async: 'true',
			ipaddr: '192.0.2.10',
		});
	});

	it('maps a user ID and pre-authentication optional fields', () => {
		const context = executionContext({
			userIdentifier: { mode: 'user_id', value: 'DU123' },
			preAuthOptionalFields: {
				clientSupportsVerifiedPush: false,
				trustedDeviceToken: ' token ',
			},
		});

		expect(mapDuoParameters(context, 1)).toEqual({
			user_id: 'DU123',
			clientSupportsVerifiedPush: 'false',
			trustedDeviceToken: 'token',
		});
	});
});
