import type { IDataObject, IExecuteFunctions } from "n8n-workflow";

const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

function assertSafeKey(key: string, source: string): void {
	if (unsafeKeys.has(key)) {
		throw new TypeError(`Unsafe parameter mapping key "${key}" in ${source}.`);
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/** Trims strings inside arrays and plain objects; other object types are returned unchanged. */
function trimStringsDeeply(value: unknown): unknown {
	if (typeof value === "string") return value.trim();
	if (Array.isArray(value)) return value.map(trimStringsDeeply);
	if (!isPlainObject(value)) return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, nestedValue]) => [
			key,
			trimStringsDeeply(nestedValue),
		]),
	);
}

function setValueAtPath(
	target: IDataObject,
	path: string,
	value: unknown,
): void {
	const pathParts = path.split(".").filter(Boolean);
	for (const part of pathParts) assertSafeKey(part, `path "${path}"`);

	const [lastPart] = pathParts.slice(-1);
	if (!lastPart) return;

	const parent = pathParts.slice(0, -1).reduce<IDataObject>((current, part) => {
		const child = Object.prototype.hasOwnProperty.call(current, part)
			? current[part]
			: undefined;
		// Only descend into plain objects so supplied values such as Date are never mutated.
		if (isPlainObject(child)) return child as IDataObject;

		const nested: IDataObject = {};
		current[part] = nested;
		return nested;
	}, target);

	parent[lastPart] = value as IDataObject[string];
}

export interface ParameterTransformContext {
	context: IExecuteFunctions;
	itemIndex: number;
}

export interface ParameterValueTransformer {
	(
		value: unknown,
		context: ParameterTransformContext,
	): IDataObject | null | undefined;
	runOnMissing?: boolean;
}

export interface TargetedParameterTransformer {
	(value: unknown, context: ParameterTransformContext): unknown;
	runOnMissing?: boolean;
}

interface ParameterMappingRuleBase {
	parameter?: string;
	staticValue?: unknown;
}

/** A rule whose transformer returns fields to merge into the mapped parameters. */
interface UntargetedParameterMappingRule extends ParameterMappingRuleBase {
	target?: never;
	transform?: ParameterValueTransformer;
}

/** A rule whose transformer result is assigned to a specific target path. */
interface TargetedParameterMappingRule extends ParameterMappingRuleBase {
	target: string;
	transform?: TargetedParameterTransformer;
}

export type ParameterMappingRule =
	UntargetedParameterMappingRule | TargetedParameterMappingRule;

/** Maps n8n node parameters into a request-ready object. */
export function mapNodeParameters(
	context: IExecuteFunctions,
	itemIndex: number,
	rules: readonly ParameterMappingRule[],
): IDataObject {
	const mappedParameters: IDataObject = {};
	for (const rule of rules) {
		const hasStaticValue = Object.prototype.hasOwnProperty.call(
			rule,
			"staticValue",
		);
		let value: unknown;
		if (hasStaticValue) {
			value = rule.staticValue;
		} else if (rule.parameter) {
			value = context.getNodeParameter(rule.parameter, itemIndex, null);
		}

		if (value === null || value === undefined) {
			if (!rule.transform?.runOnMissing) continue;
		}

		if (rule.transform) {
			const transformedValue = trimStringsDeeply(
				rule.transform(value, { context, itemIndex }),
			);
			if (transformedValue === null || transformedValue === undefined)
				continue;

			const targetPath = rule.target;
			if (targetPath !== undefined) {
				setValueAtPath(mappedParameters, targetPath, transformedValue);
			} else if (isPlainObject(transformedValue)) {
				for (const [key, fieldValue] of Object.entries(transformedValue)) {
					assertSafeKey(key, "an untargeted transform result");
					mappedParameters[key] = fieldValue as IDataObject[string];
				}
			} else {
				throw new TypeError(
					"An untargeted parameter transform must return a plain object or nullish value.",
				);
			}
			continue;
		}

		const targetPath = rule.target ?? rule.parameter;
		if (targetPath)
			setValueAtPath(
				mappedParameters,
				targetPath,
				trimStringsDeeply(value),
			);
	}
	return mappedParameters;
}
