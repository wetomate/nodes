import { createHmac, createSign, generateKeyPairSync } from "node:crypto";

import {
	supportedJwtAlgorithms,
	verifyJwt,
	type JwtAlgorithm,
} from "../src/jwt-verification";

function base64Url(value: string | Buffer): string {
	return Buffer.from(value)
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

function createToken(
	payload: Record<string, unknown>,
	algorithm: JwtAlgorithm,
	key: string | ReturnType<typeof generateKeyPairSync>["privateKey"],
): string {
	const header = base64Url(JSON.stringify({ alg: algorithm, typ: "JWT" }));
	const encodedPayload = base64Url(JSON.stringify(payload));
	const signingInput = `${header}.${encodedPayload}`;
	let signature: Buffer;

	if (algorithm.startsWith("HS")) {
		const digest = `sha${algorithm.slice(2)}` as
			| "sha256"
			| "sha384"
			| "sha512";
		signature = createHmac(digest, key).update(signingInput).digest();
	} else {
		const digest = `sha${algorithm.slice(2)}`;
		const signer = createSign(
			algorithm.startsWith("ES") ? digest : `RSA-${digest}`.toUpperCase(),
		);
		signer.update(signingInput);
		signer.end();
		signature = signer.sign({
			key: key as any,
			...(algorithm.startsWith("ES") ? { dsaEncoding: "ieee-p1363" } : {}),
			...(algorithm.startsWith("PS")
				? { padding: 6, saltLength: Number(digest.slice(3)) / 8 }
				: {}),
		});
	}

	return `${signingInput}.${base64Url(signature)}`;
}

describe("verifyJwt", () => {
	it("verifies HMAC tokens and validates time claims", () => {
		const token = createToken(
			{ sub: "user-1", exp: 200, nbf: 100 },
			"HS256",
			"secret",
		);
		expect(verifyJwt(token, "secret", "HS256", 150)).toEqual({
			sub: "user-1",
			exp: 200,
			nbf: 100,
		});
		expect(() => verifyJwt(token, "wrong", "HS256", 150)).toThrow(
			"Invalid JWT signature",
		);
		expect(() => verifyJwt(token, "secret", "HS256", 200)).toThrow(
			"JWT has expired",
		);
		expect(() => verifyJwt(token, "secret", "HS256", 99)).toThrow(
			"JWT is not active",
		);
	});

	it.each(["RS256", "PS256", "ES256"] as const)(
		"verifies %s tokens",
		(algorithm) => {
			const { privateKey, publicKey } = algorithm.startsWith("ES")
				? generateKeyPairSync("ec", { namedCurve: "prime256v1" })
				: generateKeyPairSync("rsa", { modulusLength: 2048 });
			const token = createToken({ role: "admin" }, algorithm, privateKey);
			expect(
				verifyJwt(
					token,
					publicKey.export({ type: "spki", format: "pem" }).toString(),
					algorithm,
				),
			).toEqual({
				role: "admin",
			});
		},
	);

	it("verifies ES512 signatures with long DER lengths", () => {
		const { privateKey, publicKey } = generateKeyPairSync("ec", {
			namedCurve: "secp521r1",
		});
		const token = createToken({ role: "admin" }, "ES512", privateKey);
		expect(
			verifyJwt(
				token,
				publicKey.export({ type: "spki", format: "pem" }).toString(),
				"ES512",
			),
		).toEqual({ role: "admin" });
	});

	it("rejects malformed tokens and an algorithm mismatch", () => {
		expect(() => verifyJwt("not-a-token", "secret", "HS256")).toThrow(
			"Invalid JWT",
		);
		const token = createToken({ sub: "user-1" }, "HS256", "secret");
		expect(() => verifyJwt(token, "secret", "HS384")).toThrow(
			"JWT algorithm mismatch",
		);
		expect(supportedJwtAlgorithms).toContain("PS512");
	});
});
