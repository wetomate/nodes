import type { IDataObject } from "n8n-workflow";

/** Processes a collection of optional properties for a Wetomate node. */
export function processOptionalCollections(value: IDataObject): IDataObject {
	const processed: IDataObject = {};
	for (const [key, val] of Object.entries(value)) {
		if (val !== undefined && val !== null)
			processed[key] = String(val).trim();
	}
	return Object.keys(processed).length ? processed : {};
}
