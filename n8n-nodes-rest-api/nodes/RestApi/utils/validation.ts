import Ajv, { type ErrorObject, type Options } from 'ajv';
import addFormats from 'ajv-formats';
import {
	NodeOperationError,
	type IDataObject,
	type INode,
	type IWebhookFunctions,
} from 'n8n-workflow';

function operationError(context: IWebhookFunctions, message: string): NodeOperationError {
	const getNode = (context as IWebhookFunctions & { getNode?: () => INode }).getNode;
	const node = getNode ? getNode.call(context) : ({ name: 'REST API' } as INode);
	return new NodeOperationError(node, message);
}

type SchemaField = {
	name?: string;
	type?: string;
	required?: boolean;
	nullable?: boolean;
	enumValues?: string;
	options?: IDataObject;
};

export type ValidationResult =
	| { valid: true; data: unknown }
	| { valid: false; errors: ErrorObject[] };

export function buildSchema(context: IWebhookFunctions): IDataObject {
	const source = context.getNodeParameter('schemaSource', 'fields') as string;
	if (source === 'json') {
		return parseJsonObject(context, context.getNodeParameter('jsonSchema', '{}'), 'JSON Schema');
	}

	const schemaFields = context.getNodeParameter('schemaFields', {}) as {
		values?: SchemaField[];
	};
	const schemaOptions = context.getNodeParameter('schemaOptions', {}) as IDataObject;
	const properties: IDataObject = {};
	const required: string[] = [];

	for (const field of schemaFields.values ?? []) {
		const name = field.name?.trim();
		if (!name) continue;

		const fieldSchema: IDataObject = {
			type: field.nullable ? [field.type ?? 'string', 'null'] : (field.type ?? 'string'),
		};

		const options = field.options ?? {};
		for (const key of [
			'minLength',
			'maxLength',
			'pattern',
			'format',
			'minimum',
			'maximum',
			'minItems',
			'maxItems',
			'uniqueItems',
		] as const) {
			const value = options[key];
			if (value !== undefined && value !== '') fieldSchema[key] = value;
		}

		if (field.enumValues) {
			const enumValues = parseJson(context, field.enumValues, `Allowed Values for ${name}`);
			if (!Array.isArray(enumValues)) {
				throw operationError(context, `Allowed Values for ${name} must be a JSON array`);
			}
			fieldSchema.enum = enumValues;
		}

		const nestedSchema = options.nestedSchema;
		if (nestedSchema) {
			const parsed = parseJsonObject(context, nestedSchema, `Nested Schema for ${name}`);
			Object.assign(fieldSchema, parsed);
		}

		properties[name] = fieldSchema;
		if (field.required) required.push(name);
	}

	const schema: IDataObject = {
		type: 'object',
		properties,
		additionalProperties: schemaOptions.additionalProperties ?? true,
	};
	if (required.length > 0) schema.required = required;
	return schema;
}

export function validateRequestBody(
	data: unknown,
	schema: IDataObject,
	options: IDataObject,
): ValidationResult {
	const ajvOptions: Options = {
		allErrors: options.allErrors !== false,
		coerceTypes: options.coerceTypes === true,
		removeAdditional: normalizeRemoveAdditional(options.removeAdditional),
		strict: options.strict === true,
		useDefaults: options.useDefaults === true,
	};
	const ajv = new Ajv(ajvOptions);
	if (options.validateFormats !== false) addFormats(ajv);
	const validate = ajv.compile(schema);
	const valid = validate(data);
	if (valid) return { valid: true, data };
	return { valid: false, errors: validate.errors ? [...validate.errors] : [] };
}

function normalizeRemoveAdditional(value: unknown): Options['removeAdditional'] {
	if (value === 'all' || value === 'failing') return value;
	return value === true;
}

function parseJsonObject(
	context: IWebhookFunctions,
	value: unknown,
	label: string,
): IDataObject {
	const parsed = parseJson(context, value, label);
	if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw operationError(context, `${label} must be a JSON object`);
	}
	return parsed as IDataObject;
}

function parseJson(context: IWebhookFunctions, value: unknown, label: string): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw operationError(context, `${label} is not valid JSON: ${(error as Error).message}`);
	}
}
