import type { IDataObject } from "n8n-workflow";
import {
	mapNodeParameters,
	type ParameterMappingRule,
	type TargetedParameterTransformer,
} from "./parameter-mapping";

function hasSingleEmptyJsonInputItem(
	inputItems: readonly { json: IDataObject }[],
): boolean {
	const [inputItem] = inputItems;
	return (
		inputItems.length === 1 &&
		inputItem !== undefined &&
		Object.keys(inputItem.json).length === 0
	);
}

/**
 * Transforms all n8n input items into an array using the supplied mapping rules.
 *
 * Use it with a `target`. It runs even when the rule has no value, and a single
 * input item with empty JSON produces an empty array.
 *
 * @example
 * {
 * 	target: "items",
 * 	transform: transformInputItemsToArray(
 * 		{ parameter: "listItemTitle", target: "title" },
 * 		{ parameter: "listOptionalFields", transform: transformOptionalCollectionToFields },
 * 	),
 * }
 */
export function transformInputItemsToArray(
	...rules: readonly ParameterMappingRule[]
): TargetedParameterTransformer {
	const transform: TargetedParameterTransformer = (_value, { context }) => {
		const inputItems = context.getInputData();
		if (hasSingleEmptyJsonInputItem(inputItems)) return [];
		return inputItems.map((_, itemIndex) =>
			mapNodeParameters(context, itemIndex, rules),
		);
	};
	transform.runOnMissing = true;
	return transform;
}

/**
 * Returns a shallow copy of a collection's fields for merging into the mapped output.
 *
 * Use it without a `target`. The input collection is not mutated.
 *
 * @example
 * { parameter: "additionalFields", transform: transformOptionalCollectionToFields }
 */
export function transformOptionalCollectionToFields(
	value: unknown,
): IDataObject {
	// Object.fromEntries defines own properties, so a "__proto__" key can't replace the copy's prototype.
	if (value === null || value === undefined) return {};
	return Object.fromEntries(Object.entries(value)) as IDataObject;
}

/**
 * Transforms numeric zero into undefined so optional fields can be omitted.
 *
 * Other values are returned unchanged.
 *
 * @example
 * { parameter: "limit", target: "limit", transform: transformZeroToUndefined }
 */
export function transformZeroToUndefined(value: unknown): unknown | undefined {
	return value === 0 ? undefined : value;
}
