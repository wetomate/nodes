import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { buildSchema, validateRequestBody } from '../utils/validation';

describe('REST API validation helpers', () => {
	it('builds an object schema from configured fields', () => {
		const context = parameterContext({
			schemaSource: 'fields',
			schemaFields: {
				values: [
					{
						name: 'email',
						type: 'string',
						required: true,
						nullable: false,
						enumValues: '["admin@example.com", "user@example.com"]',
						options: { format: 'email', minLength: 5 },
					},
					{
						name: 'tags',
						type: 'array',
						nullable: true,
						options: {
							uniqueItems: true,
							nestedSchema: '{"items":{"type":"string"}}',
						},
					},
				],
			},
			schemaOptions: { additionalProperties: false },
		});

		expect(buildSchema(context)).toEqual({
			type: 'object',
			properties: {
				email: {
					type: 'string',
					format: 'email',
					minLength: 5,
					enum: ['admin@example.com', 'user@example.com'],
				},
				tags: {
					type: ['array', 'null'],
					uniqueItems: true,
					items: { type: 'string' },
				},
			},
			additionalProperties: false,
			required: ['email'],
		});
	});

	it('uses a complete custom JSON Schema', () => {
		const context = parameterContext({
			schemaSource: 'json',
			jsonSchema: '{"type":"array","minItems":1}',
		});

		expect(buildSchema(context)).toEqual({ type: 'array', minItems: 1 });
	});

	it('reports all request errors with stable AJV details', () => {
		const result = validateRequestBody(
			{ email: 'not-an-email', age: 12 },
			{
				type: 'object',
				required: ['name'],
				properties: {
					email: { type: 'string', format: 'email' },
					age: { type: 'integer', minimum: 18 },
				},
			},
			{ allErrors: true, validateFormats: true },
		);

		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.errors.map((error) => error.keyword)).toEqual([
				'required',
				'format',
				'minimum',
			]);
		}
	});

	it('applies explicitly enabled AJV mutations to the request body', () => {
		const body: IDataObject = { count: '2', extra: true };
		const result = validateRequestBody(
			body,
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					count: { type: 'integer' },
					status: { type: 'string', default: 'new' },
				},
			},
			{ coerceTypes: true, removeAdditional: 'all', useDefaults: true },
		);

		expect(result.valid).toBe(true);
		expect(body).toEqual({ count: 2, status: 'new' });
	});

	it.each([
		['JSON Schema', { schemaSource: 'json', jsonSchema: '[]' }],
		[
			'Allowed Values for role',
			{
				schemaSource: 'fields',
				schemaFields: { values: [{ name: 'role', enumValues: '{}' }] },
			},
		],
	])('rejects an invalid %s configuration', (message, parameters) => {
		expect(() => buildSchema(parameterContext(parameters))).toThrow(message);
	});
});

function parameterContext(parameters: Record<string, unknown>): IWebhookFunctions {
	return {
		getNodeParameter(name: string, fallbackValue?: unknown) {
			return parameters[name] ?? fallbackValue;
		},
	} as IWebhookFunctions;
}
