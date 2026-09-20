import type { IDataObject } from 'n8n-workflow';

export type RestApiParameters = {
	httpMethod: string | string[];
	responseMode: string;
	responseData?: string;
	responseBinaryPropertyName?: string;
	path?: string;
	options?: {
		noResponseBody?: boolean;
		responseCode?: number;
		responseContentType?: string;
		responseData?: string;
		responseHeaders?: IDataObject;
		responsePropertyName?: string;
	};
};

export function getResponseCode(parameters: RestApiParameters): number {
	return parameters.options?.responseCode ?? 200;
}

export function getResponseData(parameters: RestApiParameters): string | undefined {
	if (parameters.responseData) return parameters.responseData;
	if (parameters.responseMode === 'onReceived' && parameters.options?.responseData) {
		return parameters.options.responseData;
	}
	if (parameters.options?.noResponseBody) return 'noData';
	return undefined;
}

export function configuredOutputs(parameters: RestApiParameters) {
	const methods = Array.isArray(parameters.httpMethod)
		? parameters.httpMethod
		: [parameters.httpMethod];

	return methods.map((method) => ({ type: 'main', displayName: method }));
}
