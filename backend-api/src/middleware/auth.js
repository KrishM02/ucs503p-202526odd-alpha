import jwt from "jsonwebtoken";

/**
 * 1. Basic helper: Verifies a raw token string
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token verify error:", error.message);
    return null;
  }
}

/**
 * 2. Middleware: Extracts token from headers, verifies, and INJECTS authHash into body
 * Safe to use even if you accidentally pass the wrong argument.
 */
export function verifyJWT(req) {
  // SAFETY CHECK: If 'req' is a string, user called the wrong function. 
  // Redirect to the string verifier to prevent crash.
  if (typeof req === 'string') {
    return verifyToken(req);
  }

  // Normal Logic: Extract from Request Object
  const authHeader = req.headers?.authorization || "";
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : req.cookies?.jwtoken; // Fallback to cookie

  if (!token) return null;

  const decoded = verifyToken(token);

  // Inject email and authHash into req.body for the API route to use
  if (decoded && req.body && typeof req.body === 'object') {
    req.body.userEmail = decoded.email;
    req.body.authHash = decoded.authHash;
  }

  return decoded;
}

export function generateJWT(email, authHash) {
  return jwt.sign({ email, authHash }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}