import type { IDataObject } from "n8n-workflow";

import { processOptionalCollections } from "../src/collections";

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
