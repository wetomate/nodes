import type { IDataObject, IExecuteFunctions } from "n8n-workflow";

export interface ParameterTransformContext {
	context: IExecuteFunctions;
	itemIndex: number;
}

export type ParameterTransformer = (
	value: unknown,
	context: ParameterTransformContext,
) => IDataObject | null | undefined;

export interface ParameterMappingRule {
	parameter: string;
	target?: string;
	transform?: ParameterTransformer;
}

/**
 * Maps n8n node parameters into a request-ready object.
 *
 * Node UI properties stay as standard `INodeProperties[]`; these rules describe only the
 * execution-time mapping. Rules without a transformer stringify and trim their value. A
 * transformer can emit one or more fields, or return `null`/`undefined` to omit the value.
 */
export function mapNodeParameters(
	context: IExecuteFunctions,
	itemIndex: number,
	rules: readonly ParameterMappingRule[],
): IDataObject {
	return rules.reduce<IDataObject>((parameters, rule) => {
		const value = context.getNodeParameter(rule.parameter, itemIndex, null);

		if (value === null || value === undefined) return parameters;

		if (rule.transform) {
			const transformed = rule.transform(value, { context, itemIndex });
			if (transformed) Object.assign(parameters, transformed);
			return parameters;
		}

		parameters[rule.target ?? rule.parameter] = String(value).trim();
		return parameters;
	}, {});
}
