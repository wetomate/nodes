import {
	mapNodeParameters,
	transformInputItemsToArray,
	transformOptionalCollectionToFields,
	transformZeroToUndefined,
} from "../src";
import type { IExecuteFunctions } from "n8n-workflow";

describe("parameter transforms", () => {
	it("maps input items and adds static parameter values", () => {
		const context = {
			getInputData: () => [
				{ json: { title: "First" } },
				{ json: { title: "Second" } },
			],
			getNodeParameter: (name: string, itemIndex: number) =>
				name === "title"
					? itemIndex === 0
						? " First "
						: " Second "
					: null,
		} as unknown as IExecuteFunctions;
		const transform = transformInputItemsToArray(
			{ parameter: "title", target: "title" },
			{
				parameter: "row_action",
				target: "row_action",
				staticValue: { type: "noop" },
			},
		);

		expect(transform(undefined, { context, itemIndex: 0 })).toEqual([
			{ title: "First", row_action: { type: "noop" } },
			{ title: "Second", row_action: { type: "noop" } },
		]);
	});

	it("recognizes an empty JSON input item without inspecting binary data", () => {
		const context = {
			getInputData: () => [
				{ json: {}, binary: { data: { data: "payload" } } },
			],
			getNodeParameter: jest.fn(),
		} as unknown as IExecuteFunctions;
		const transform = transformInputItemsToArray({
			parameter: "title",
			target: "title",
		});

		expect(transform(undefined, { context, itemIndex: 0 })).toEqual([]);
		expect(context.getNodeParameter).not.toHaveBeenCalled();
	});

	it("preserves values in optional fields", () => {
		expect(
			transformOptionalCollectionToFields({
				label: "  example  ",
				count: 0,
				enabled: false,
				empty: "   ",
				nullValue: null,
				undefinedValue: undefined,
			}),
		).toEqual({
			label: "  example  ",
			count: 0,
			enabled: false,
			empty: "   ",
			nullValue: null,
			undefinedValue: undefined,
		});
	});

	it("does not mutate an optional collection", () => {
		const collection = { present: " value ", missing: undefined };
		expect(transformOptionalCollectionToFields(collection)).toEqual(
			collection,
		);
		expect(collection).toEqual({ present: " value ", missing: undefined });
	});

	it("copies an own __proto__ key without changing the copy's prototype", () => {
		const collection = JSON.parse('{"__proto__": {"isAdmin": true}}');

		const fields = transformOptionalCollectionToFields(collection);

		expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
		expect((fields as Record<string, unknown>).isAdmin).toBeUndefined();
	});

	it("rejects a collection with an own __proto__ key when merged", () => {
		const context = {
			getNodeParameter: () =>
				JSON.parse('{"__proto__": {"isAdmin": true}, "label": "a"}'),
		} as unknown as IExecuteFunctions;

		expect(() =>
			mapNodeParameters(context, 0, [
				{
					parameter: "additionalFields",
					transform: transformOptionalCollectionToFields,
				},
			]),
		).toThrow(TypeError);
		expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
	});

	it.each([null, undefined])(
		"returns no fields for a %s collection",
		(collection) => {
			expect(transformOptionalCollectionToFields(collection)).toEqual({});
		},
	);

	it("omits zero values and preserves other values", () => {
		expect(transformZeroToUndefined(0)).toBeUndefined();
		expect(transformZeroToUndefined(2)).toBe(2);
		expect(transformZeroToUndefined(2.5)).toBe(2.5);
		expect(transformZeroToUndefined(-1)).toBe(-1);
	});
});
