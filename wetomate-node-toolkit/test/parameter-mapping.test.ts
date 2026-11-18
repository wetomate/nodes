import type { IDataObject, IExecuteFunctions } from "n8n-workflow";

import {
	mapNodeParameters,
	transformInputItemsToArray,
	type ParameterMappingRule,
	type ParameterValueTransformer,
	type TargetedParameterTransformer,
} from "../src";

function executionContext(
	values: Record<string, unknown>,
	items: Array<{ json: Record<string, unknown> }> = [],
) {
	const getNodeParameter = jest.fn(
		(name: string, _itemIndex: number, fallbackValue?: unknown) =>
			Object.prototype.hasOwnProperty.call(values, name)
				? values[name]
				: fallbackValue,
	);
	const context = {
		getNodeParameter,
		getNode: () => ({}),
		getInputData: () => items,
	} as unknown as IExecuteFunctions;
	return { context, getNodeParameter };
}

describe("mapNodeParameters", () => {
	it("requires object results for untargeted transforms and allows arbitrary targeted values", () => {
		const objectTransform: ParameterValueTransformer = () => ({
			mapped: true,
		});
		const scalarTransform: TargetedParameterTransformer = () => "mapped";
		const objectRule: ParameterMappingRule = {
			parameter: "source",
			transform: objectTransform,
		};
		const targetedRule: ParameterMappingRule = {
			parameter: "source",
			target: "value",
			transform: scalarTransform,
		};

		// @ts-expect-error An untargeted transform must return a mergeable object.
		const invalidRule: ParameterMappingRule = {
			parameter: "source",
			transform: () => "mapped",
		};
		// @ts-expect-error Arrays must also be assigned through a target path.
		const invalidArrayRule: ParameterMappingRule = {
			parameter: "source",
			transform: () => ["mapped"],
		};
		void invalidRule;
		void invalidArrayRule;

		const { context } = executionContext({ source: "input" });
		expect(mapNodeParameters(context, 0, [objectRule])).toEqual({
			mapped: true,
		});
		expect(mapNodeParameters(context, 0, [targetedRule])).toEqual({
			value: "mapped",
		});
	});

	it("preserves static value types", () => {
		const { context } = executionContext({});
		expect(
			mapNodeParameters(context, 0, [
				{
					target: "settings",
					staticValue: { enabled: false, count: 0, labels: [" value "] },
				},
			]),
		).toEqual({ settings: { enabled: false, count: 0, labels: ["value"] } });
	});

	it("throws instead of silently dropping invalid untargeted transform results", () => {
		const { context } = executionContext({ source: "input" });
		const invalidTransform = (() => [
			"not an object",
		]) as unknown as ParameterValueTransformer;

		expect(() =>
			mapNodeParameters(context, 0, [
				{
					parameter: "source",
					transform: invalidTransform,
				},
			]),
		).toThrow(
			"An untargeted parameter transform must return a plain object or nullish value.",
		);
	});

	it("maps nested multi-parameter item rules into one target collection", () => {
		const { context, getNodeParameter } = executionContext(
			{ rowTitle: "Row", rowId: "id-1", optional: { subtitle: " Sub " } },
			[{ json: {} }, { json: {} }],
		);
		const rules: ParameterMappingRule[] = [
			{
				target: "items",
				transform: transformInputItemsToArray(
					{ parameter: "rowTitle", target: "title" },
					{ parameter: "rowId", target: "id" },
					{
						parameter: "optional",
						transform: (value: unknown) => value as IDataObject,
					},
				),
			},
		];

		expect(mapNodeParameters(context, 0, rules)).toEqual({
			items: [
				{ title: "Row", id: "id-1", subtitle: "Sub" },
				{ title: "Row", id: "id-1", subtitle: "Sub" },
			],
		});
		expect(getNodeParameter).toHaveBeenCalledWith("rowTitle", 1, null);
	});

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
			enabled: false,
		});
	});

	it("preserves true and false boolean values without transforms", () => {
		const rules: ParameterMappingRule[] = [
			{ parameter: "enabled", target: "search_enabled" },
			{ parameter: "disabled" },
			{ parameter: "page", target: "next_page" },
		];
		const { context } = executionContext({
			enabled: true,
			disabled: false,
			page: 0,
		});

		expect(mapNodeParameters(context, 0, rules)).toEqual({
			search_enabled: true,
			disabled: false,
			next_page: 0,
		});
	});

	it("trims string values returned by transforms, including nested properties", () => {
		const rules: ParameterMappingRule[] = [
			{
				parameter: "label",
				target: "label",
				transform: () => "  mapped label  ",
			},
			{
				parameter: "metadata",
				transform: () => ({ nested: { label: "  nested label  " } }),
			},
		];
		const { context } = executionContext({ label: "input", metadata: {} });

		expect(mapNodeParameters(context, 0, rules)).toEqual({
			label: "mapped label",
			nested: { label: "nested label" },
		});
	});

	it("preserves a targeted Date result", () => {
		const createdAt = new Date("2026-11-14T00:00:00Z");
		const { context } = executionContext({ source: "input" });

		const mapped = mapNodeParameters(context, 0, [
			{
				parameter: "source",
				target: "created_at",
				transform: () => createdAt,
			},
		]);

		expect(mapped.created_at).toBeInstanceOf(Date);
		expect(mapped.created_at).toBe(createdAt);
	});

	it("preserves a Date nested in an object transform while trimming sibling strings", () => {
		const createdAt = new Date("2026-11-14T00:00:00Z");
		const { context } = executionContext({ source: "input" });

		const mapped = mapNodeParameters(context, 0, [
			{
				parameter: "source",
				transform: () => ({
					event: { created_at: createdAt, label: "  created  " },
				}),
			},
		]);

		expect(mapped).toEqual({
			event: { created_at: createdAt, label: "created" },
		});
		expect((mapped.event as IDataObject).created_at).toBeInstanceOf(Date);
	});

	it.each([
		"__proto__.polluted",
		"constructor.prototype.polluted",
		"nested.prototype",
	])(
		"rejects the unsafe target path %s without modifying global prototypes",
		(target) => {
			const { context } = executionContext({});

			expect(() =>
				mapNodeParameters(context, 0, [{ target, staticValue: true }]),
			).toThrow(TypeError);
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
			expect(
				Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"),
			).toBe(false);
		},
	);

	it("rejects an unsafe untargeted parameter name used as the output path", () => {
		const { context } = executionContext({});

		expect(() =>
			mapNodeParameters(context, 0, [
				{ parameter: "__proto__", staticValue: "value" },
			]),
		).toThrow(TypeError);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it("does not traverse inherited properties when building nested paths", () => {
		const { context } = executionContext({});

		const mapped = mapNodeParameters(context, 0, [
			{ target: "toString.value", staticValue: "own" },
		]);

		expect(Object.prototype.hasOwnProperty.call(mapped, "toString")).toBe(
			true,
		);
		expect(mapped.toString).toEqual({ value: "own" });
		expect(({} as Record<string, unknown>).value).toBeUndefined();
	});

	it.each(["__proto__", "constructor", "prototype"])(
		"rejects an untargeted transform result with an own %s key",
		(key) => {
			const { context } = executionContext({ source: "input" });
			const result = JSON.parse(
				`{"${key}": {"isAdmin": true}, "name": "Ali"}`,
			) as IDataObject;

			expect(() =>
				mapNodeParameters(context, 0, [
					{ parameter: "source", transform: () => result },
				]),
			).toThrow(TypeError);
			expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
		},
	);

	it("rejects an untargeted transform result that isn't a plain object", () => {
		const { context } = executionContext({ source: "input" });
		const notPlain = new Date() as unknown as IDataObject;

		expect(() =>
			mapNodeParameters(context, 0, [
				{ parameter: "source", transform: () => notPlain },
			]),
		).toThrow(
			"An untargeted parameter transform must return a plain object or nullish value.",
		);
	});

	it("does not mutate a supplied Date when a later path writes beneath it", () => {
		const createdAt = new Date("2026-11-14T00:00:00Z");
		const { context } = executionContext({ source: "input" });

		const mapped = mapNodeParameters(context, 0, [
			{
				parameter: "source",
				target: "created_at",
				transform: () => createdAt,
			},
			{ target: "created_at.note", staticValue: "x" },
		]);

		expect(Object.prototype.hasOwnProperty.call(createdAt, "note")).toBe(
			false,
		);
		expect(createdAt.toISOString()).toBe("2026-11-14T00:00:00.000Z");
		expect(mapped.created_at).toEqual({ note: "x" });
	});

	it("still writes nested paths into plain objects created by earlier rules", () => {
		const { context } = executionContext({});

		const mapped = mapNodeParameters(context, 0, [
			{ target: "hero.component", staticValue: "list" },
			{ target: "hero.config.next_page", staticValue: 2 },
		]);

		expect(mapped).toEqual({
			hero: { component: "list", config: { next_page: 2 } },
		});
	});

	it("reads parameters at the requested item index and omits missing values", () => {
		const rules: ParameterMappingRule[] = [
			{ parameter: "present" },
			{ parameter: "missing" },
		];
		const { context, getNodeParameter } = executionContext({ present: "" });

		expect(mapNodeParameters(context, 3, rules)).toEqual({ present: "" });
		expect(getNodeParameter).toHaveBeenNthCalledWith(1, "present", 3, null);
		expect(getNodeParameter).toHaveBeenNthCalledWith(2, "missing", 3, null);
	});

	it("merges object transforms and supplies execution metadata", () => {
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

	it.each([null, undefined])("omits a transform result of %s", (result) => {
		const { context } = executionContext({ optional: { value: "provided" } });
		expect(
			mapNodeParameters(context, 0, [
				{ parameter: "optional", transform: () => result },
			]),
		).toEqual({});
	});

	it("does not mutate the rules or source value", () => {
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
