import {
	constants,
	createHmac,
	createPublicKey,
	createVerify,
	timingSafeEqual,
} from "node:crypto";

export const supportedJwtAlgorithms = [
	"HS256",
	"HS384",
	"HS512",
	"RS256",
	"RS384",
	"RS512",
	"ES256",
	"ES384",
	"ES512",
	"PS256",
	"PS384",
	"PS512",
] as const;

export type JwtAlgorithm = (typeof supportedJwtAlgorithms)[number];
export type JwtPayload = Record<string, unknown> | string;

type JwtHeader = { alg?: unknown };

export function verifyJwt(
	token: string,
	key: string,
	algorithm: JwtAlgorithm,
	nowSeconds = Math.floor(Date.now() / 1000),
): JwtPayload {
	if (!(supportedJwtAlgorithms as readonly string[]).includes(algorithm)) {
		throw new Error("Unsupported JWT algorithm");
	}
	const parts = token.split(".");
	if (parts.length !== 3) throw new Error("Invalid JWT");

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const header = parseJson<JwtHeader>(encodedHeader);
	const payload = parseJson<JwtPayload>(encodedPayload);
	if (header.alg !== algorithm) throw new Error("JWT algorithm mismatch");
	if (!key) throw new Error("JWT verification key is empty");

	const signingInput = `${encodedHeader}.${encodedPayload}`;
	const signature = decodeBase64Url(encodedSignature);
	const digest = `sha${algorithm.slice(2)}` as "sha256" | "sha384" | "sha512";

	if (algorithm.startsWith("HS")) {
		const expected = createHmac(digest, key).update(signingInput).digest();
		if (
			expected.length !== signature.length ||
			!timingSafeEqual(expected, signature)
		) {
			throw new Error("Invalid JWT signature");
		}
	} else {
		const verifier = createVerify(
			algorithm.startsWith("ES")
				? digest.toUpperCase()
				: `RSA-${digest}`.toUpperCase(),
		);
		verifier.update(signingInput);
		verifier.end();
		const verifyOptions = {
			key: createPublicKey(key),
			...(algorithm.startsWith("PS")
				? {
						padding: constants.RSA_PKCS1_PSS_PADDING,
						saltLength: digestLength(digest),
					}
				: {}),
		};
		const derSignature = algorithm.startsWith("ES")
			? joseEcdsaSignatureToDer(signature, ecdsaComponentLength(algorithm))
			: signature;
		if (!verifier.verify(verifyOptions, derSignature))
			throw new Error("Invalid JWT signature");
	}

	validateClaims(payload, nowSeconds);
	return payload;
}

function validateClaims(payload: JwtPayload, nowSeconds: number): void {
	if (typeof payload === "string") return;
	if (typeof payload.exp === "number" && nowSeconds >= payload.exp)
		throw new Error("JWT has expired");
	if (typeof payload.nbf === "number" && nowSeconds < payload.nbf)
		throw new Error("JWT is not active");
}

function parseJson<T>(value: string): T {
	return JSON.parse(decodeBase64Url(value).toString("utf8")) as T;
}

function decodeBase64Url(value: string): Buffer {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid JWT encoding");
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(
		normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
		"base64",
	);
}

function digestLength(digest: "sha256" | "sha384" | "sha512"): number {
	return Number(digest.slice(3)) / 8;
}

function ecdsaComponentLength(algorithm: JwtAlgorithm): number {
	return algorithm === "ES256" ? 32 : algorithm === "ES384" ? 48 : 66;
}

function joseEcdsaSignatureToDer(
	signature: Buffer,
	componentLength: number,
): Buffer {
	if (signature.length !== componentLength * 2)
		throw new Error("Invalid JWT signature");
	const content = Buffer.concat([
		derInteger(signature.subarray(0, componentLength)),
		derInteger(signature.subarray(componentLength)),
	]);
	return Buffer.concat([
		Buffer.from([0x30]),
		derLength(content.length),
		content,
	]);
}

function derInteger(value: Buffer): Buffer {
	let integer = value;
	while (integer.length > 1 && integer[0] === 0) integer = integer.subarray(1);
	if (integer[0] & 0x80) integer = Buffer.concat([Buffer.from([0]), integer]);
	return Buffer.concat([
		Buffer.from([0x02]),
		derLength(integer.length),
		integer,
	]);
}

function derLength(length: number): Buffer {
	if (length < 0x80) return Buffer.from([length]);
	const bytes: number[] = [];
	for (let value = length; value > 0; value >>>= 8)
		bytes.unshift(value & 0xff);
	return Buffer.from([0x80 | bytes.length, ...bytes]);
}
