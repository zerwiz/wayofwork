import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.WOP_AUTH_SECRET || "way-of-pi-secret-key-change-me");

export async function createToken(userId: string, tenantId: string) {
	return await new SignJWT({ userId, tenantId })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("24h")
		.sign(SECRET);
}

export async function verifyToken(token: string) {
	try {
		const { payload } = await jwtVerify(token, SECRET);
		return payload as { userId: string; tenantId: string };
	} catch {
		return null;
	}
}
