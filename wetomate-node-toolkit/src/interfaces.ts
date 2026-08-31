import { IDataObject, IExecuteFunctions, INodeProperties } from "n8n-workflow";

export interface IWetomateNodeProperties extends INodeProperties {
	/**
	 * A custom processor to transform a property value before including it in an API request.
	 *
	 * Use this to clean, format, or modify the value based on the property value itself
	 * or metadata of the property (like displayName, name, or type).
	 *
	 * @param value - The current value of this property.
	 * @param ctx - Execution context (`IExecuteFunctions`) used to access node utilities and workflow data.
	 * @returns A partial object (IDataObject) with processed key-value pairs,
	 *          or null/void to ignore this property in the final result.
	 * @deprecated Use standard `INodeProperties` and separate `ParameterMappingRule` values.
	 */
	process?: (
		value: IDataObject,
		ctx?: IExecuteFunctions,
	) => IDataObject | null | void;
}

/** @deprecated Use `mapNodeParameters()` with separate parameter mapping rules. */
export class WetomateNodePropertiesArray extends Array<IWetomateNodeProperties> {
	/**
	 * Collects and processes all node properties into a single object suitable for API requests.
	 *
	 * Iterates over each property in the array, retrieves its current value from the node context,
	 * and applies the optional `process` function if defined.
	 *
	 * - If `process` is defined and returns an object, its key-value pairs are merged into the result.
	 * - If `process` is not defined, the raw value is included as-is.
	 * - Properties with a value of 'ignore' are skipped.
	 *
	 * @param ctx - The execution context, used to retrieve the current value of each node parameter.
	 * @param itemIndex - Index of the input item to get parameter values for, used when expressions depend on the item.
	 * @returns An IDataObject containing all processed key-value pairs ready for API requests.
	 * @deprecated Use `mapNodeParameters()` with separate parameter mapping rules.
	 */
	processParams(ctx: IExecuteFunctions, itemIndex: number): IDataObject {
		return this.reduce<IDataObject>((params, prop) => {
			const value = ctx.getNodeParameter(prop.name, itemIndex, "ignore");

			if (value !== "ignore") {
				if (prop.process) {
					const processed = prop.process(value as IDataObject, ctx);
					if (processed) {
						if (typeof processed === "object") {
							Object.assign(params, processed);
						}
					}
				} else {
					params[prop.name] = String(value).trim();
				}
			}

			return params;
		}, {});
	}
}

/**
 * Processes a collection of optional properties for a Wetomate node.
 *
 * This function takes an object (`value`) and returns a new object with the same keys but with
 * all values converted to trimmed strings. Properties that are `undefined` or `null`
 * are omitted from the result.
 *
 * This is typically used to transform a collection property from an `IWetomateNodeProperties`
 * into a processed object that can be assigned to the `process` property.
 *
 * @param value - An object representing the default values of a collection property.
 * @returns An object containing only the defined properties as trimmed strings,
 *          or an empty object if no properties are defined.
 */
export function processOptionalCollections(value: IDataObject) {
	const processed: IDataObject = {};
	for (const [key, val] of Object.entries(value)) {
		const strValue: string = String(val).trim();
		if (val !== undefined && val !== null) {
			processed[key] = strValue;
		}
	}
	return Object.keys(processed).length ? processed : {};
}
