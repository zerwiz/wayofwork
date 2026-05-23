import { SignJWT, jwtVerify } from "jose";

const SECRET_RAW = process.env.WOP_AUTH_SECRET;
if (!SECRET_RAW && process.env.NODE_ENV === "production") {
	console.error("FATAL: WOP_AUTH_SECRET must be set in production");
	process.exit(1);
}
const SECRET = new TextEncoder().encode(SECRET_RAW || "dev-secret-change-me-in-production");

export interface AuthInfo {
	userId: string;
	tenantId: string;
	role?: string;
}

export async function createToken(userId: string, tenantId: string, role?: string) {
	return await new SignJWT({ userId, tenantId, role })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("24h")
		.sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthInfo | null> {
	try {
		const { payload } = await jwtVerify(token, SECRET);
		return payload as unknown as AuthInfo;
	} catch {
		return null;
	}
}
