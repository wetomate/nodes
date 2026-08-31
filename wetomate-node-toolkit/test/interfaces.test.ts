import type { IDataObject, IExecuteFunctions } from "n8n-workflow";

import {
	processOptionalCollections,
	type IWetomateNodeProperties,
	WetomateNodePropertiesArray,
} from "../src";

const property = (
	name: string,
	process?: IWetomateNodeProperties["process"],
): IWetomateNodeProperties => ({
	displayName: name,
	name,
	type: "string",
	default: "",
	process,
});

const executionContext = (values: Record<string, unknown>) => {
	const getNodeParameter = jest.fn(
		(name: string, _itemIndex: number, fallbackValue?: unknown) =>
			values[name] ?? fallbackValue,
	);
	const context = { getNodeParameter } as unknown as IExecuteFunctions;

	return { context, getNodeParameter };
};

describe("processOptionalCollections", () => {
	it("trims and stringifies defined values", () => {
		expect(
			processOptionalCollections({
				label: "  example  ",
				count: 0,
				enabled: false,
				empty: "   ",
			}),
		).toEqual({
			label: "example",
			count: "0",
			enabled: "false",
			empty: "",
		});
	});

	it("omits nullish values without mutating the input", () => {
		const input: IDataObject = {
			present: " value ",
			nullValue: null,
			undefinedValue: undefined,
		};

		expect(processOptionalCollections(input)).toEqual({ present: "value" });
		expect(input).toEqual({
			present: " value ",
			nullValue: null,
			undefinedValue: undefined,
		});
	});

	it.each([{}, { absent: null }, { absent: undefined }])(
		"returns an empty object when no values are defined",
		(input) => {
			expect(processOptionalCollections(input)).toEqual({});
		},
	);
});

describe("WetomateNodePropertiesArray.processParams", () => {
	it("retrieves raw parameters for the requested item and trims their string values", () => {
		const properties = new WetomateNodePropertiesArray(
			property("name"),
			property("count"),
		);
		const { context, getNodeParameter } = executionContext({
			name: "  Alice  ",
			count: 4,
		});

		expect(properties.processParams(context, 2)).toEqual({
			name: "Alice",
			count: "4",
		});
		expect(getNodeParameter).toHaveBeenNthCalledWith(1, "name", 2, "ignore");
		expect(getNodeParameter).toHaveBeenNthCalledWith(2, "count", 2, "ignore");
	});

	it("skips parameters that resolve to the ignore sentinel", () => {
		const properties = new WetomateNodePropertiesArray(
			property("missing"),
			property("explicitlyIgnored"),
			property("present"),
		);
		const { context } = executionContext({
			explicitlyIgnored: "ignore",
			present: "",
		});

		expect(properties.processParams(context, 0)).toEqual({ present: "" });
	});

	it("passes nested collection values and the execution context to custom processors", () => {
		const process = jest.fn((value: IDataObject) =>
			processOptionalCollections(value),
		);
		const properties = new WetomateNodePropertiesArray(
			property("options", process),
		);
		const options = { label: "  primary ", omitted: null };
		const { context } = executionContext({ options });

		expect(properties.processParams(context, 1)).toEqual({
			label: "primary",
		});
		expect(process).toHaveBeenCalledWith(options, context);
	});

	it.each([
		["null", null],
		["undefined", undefined],
	] as const)("omits a processor result of %s", (_label, processorResult) => {
		const properties = new WetomateNodePropertiesArray(
			property("optional", () => processorResult),
		);
		const { context } = executionContext({ optional: { value: "provided" } });

		expect(properties.processParams(context, 0)).toEqual({});
	});

	it("merges processor results in property order", () => {
		const properties = new WetomateNodePropertiesArray(
			property("first", () => ({ shared: "first", left: true })),
			property("second", () => ({ shared: "second", right: true })),
		);
		const { context } = executionContext({ first: {}, second: {} });

		expect(properties.processParams(context, 0)).toEqual({
			shared: "second",
			left: true,
			right: true,
		});
	});
});
