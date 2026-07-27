import { SignJWT, jwtVerify } from "jose";

const MIN_SECRET_LENGTH = 8;

function getJwtSecret() {
  const secretValue = process.env.JWT_SECRET;
  if (!secretValue) throw new Error("JWT_SECRET is not configured.");
  if (secretValue.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  return new TextEncoder().encode(secretValue);
}

function sessionExpirySeconds(remember = false) {
  return remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
}

export async function createSessionToken(user, remember = false) {
  const secret = getJwtSecret();
  const expiresIn = sessionExpirySeconds(remember);
  const payload = {
    role: user.role,
    email: user.email,
    name: user.name,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(user._id?.toString ? user._id.toString() : String(user._id || user.id))
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secret);
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!payload?.sub) return null;
    return {
      userId: payload.sub,
      role: typeof payload.role === "string" ? payload.role : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (err) {
    return null;
  }
}
