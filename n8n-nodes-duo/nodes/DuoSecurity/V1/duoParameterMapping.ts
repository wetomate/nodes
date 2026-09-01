import {
	mapNodeParameters,
	processOptionalCollections,
	type ParameterMappingRule,
} from '@wetomate/n8n-node-toolkit';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

export const duoParameterRules: readonly ParameterMappingRule[] = [
	{
		parameter: 'userIdentifier',
		transform: (value) => {
			if (!value || typeof value !== 'object') return;

			const { mode, value: identifier } = value as {
				mode?: string;
				value?: string;
			};

			return mode && identifier ? { [mode]: identifier } : undefined;
		},
	},
	{ parameter: 'txid' },
	{ parameter: 'factor' },
	{ parameter: 'passcode' },
	{ parameter: 'device' },
	{
		parameter: 'pushinfo',
		transform: (value) => {
			if (!value || typeof value !== 'object') return;

			const pairs = (value as IDataObject).pairs;
			if (!Array.isArray(pairs)) return;

			const pushinfo = (pairs as Array<{ key?: string; value?: string }>)
				.filter((pair) => pair.key && pair.value)
				.map((pair) => `${pair.key}=${encodeURIComponent(pair.value!)}`)
				.join('&');

			return pushinfo ? { pushinfo } : undefined;
		},
	},
	{
		parameter: 'authOptionalFields',
		transform: (value) =>
			value && typeof value === 'object'
				? processOptionalCollections(value as IDataObject)
				: undefined,
	},
	{
		parameter: 'preAuthOptionalFields',
		transform: (value) =>
			value && typeof value === 'object'
				? processOptionalCollections(value as IDataObject)
				: undefined,
	},
];

export function mapDuoParameters(context: IExecuteFunctions, itemIndex: number): IDataObject {
	return mapNodeParameters(context, itemIndex, duoParameterRules);
}
