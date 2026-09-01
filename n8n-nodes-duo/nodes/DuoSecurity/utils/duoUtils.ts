import { IDataObject } from 'n8n-workflow';

function sortParams(input: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(input).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
	);
}

export function safeStringify(obj?: IDataObject | null): string {
	return obj ? JSON.stringify(sortParams(obj)) : '';
}
