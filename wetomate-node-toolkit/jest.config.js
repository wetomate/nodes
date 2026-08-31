module.exports = {
	...require("../configs/jest.base.js"),
	rootDir: ".",
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
	},
};
