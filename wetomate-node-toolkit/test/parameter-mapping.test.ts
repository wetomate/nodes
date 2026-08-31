import type { IExecuteFunctions } from "n8n-workflow";

import { mapNodeParameters, type ParameterMappingRule } from "../src";

function executionContext(values: Record<string, unknown>) {
	const getNodeParameter = jest.fn(
		(name: string, _itemIndex: number, fallbackValue?: unknown) =>
			Object.prototype.hasOwnProperty.call(values, name)
				? values[name]
				: fallbackValue,
	);
	const context = { getNodeParameter } as unknown as IExecuteFunctions;

	return { context, getNodeParameter };
}

describe("mapNodeParameters", () => {
	it("maps, trims, and renames standard parameter values", () => {
		const rules: ParameterMappingRule[] = [
			{ parameter: "name" },
			{ parameter: "identifier", target: "user_id" },
			{ parameter: "enabled" },
		];
		const { context } = executionContext({
			name: "  Alice  ",
			identifier: " DU123 ",
			enabled: false,
		});

		expect(mapNodeParameters(context, 0, rules)).toEqual({
			name: "Alice",
			user_id: "DU123",
			enabled: "false",
		});
	});

	it("reads every value at the requested item index and omits missing values", () => {
		const rules: ParameterMappingRule[] = [
			{ parameter: "present" },
			{ parameter: "missing" },
		];
		const { context, getNodeParameter } = executionContext({ present: "" });

		expect(mapNodeParameters(context, 3, rules)).toEqual({ present: "" });
		expect(getNodeParameter).toHaveBeenNthCalledWith(1, "present", 3, null);
		expect(getNodeParameter).toHaveBeenNthCalledWith(2, "missing", 3, null);
	});

	it("merges transformed fields and supplies execution metadata", () => {
		const transform = jest.fn((_value: unknown, { context, itemIndex }) => ({
			itemIndex,
			hasContext: Boolean(context),
		}));
		const rules: ParameterMappingRule[] = [
			{
				parameter: "first",
				transform: () => ({ shared: "first", left: true }),
			},
			{
				parameter: "second",
				transform: () => ({ shared: "second", right: true }),
			},
			{ parameter: "metadata", transform },
		];
		const { context } = executionContext({
			first: {},
			second: {},
			metadata: {},
		});

		expect(mapNodeParameters(context, 2, rules)).toEqual({
			shared: "second",
			left: true,
			right: true,
			itemIndex: 2,
			hasContext: true,
		});
		expect(transform).toHaveBeenCalledWith({}, { context, itemIndex: 2 });
	});

	it.each([null, undefined])("omits a transformer result of %s", (result) => {
		const rules: ParameterMappingRule[] = [
			{ parameter: "optional", transform: () => result },
		];
		const { context } = executionContext({ optional: { value: "provided" } });

		expect(mapNodeParameters(context, 0, rules)).toEqual({});
	});

	it("does not mutate the mapping rules or source value", () => {
		const source = { value: " original " };
		const rules = Object.freeze([
			Object.freeze({
				parameter: "source",
				transform: (value: unknown) => ({
					copied: (value as { value: string }).value.trim(),
				}),
			}),
		]);
		const { context } = executionContext({ source });

		expect(mapNodeParameters(context, 0, rules)).toEqual({
			copied: "original",
		});
		expect(source).toEqual({ value: " original " });
	});
});
