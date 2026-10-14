import { resolveUser } from "../../lib/auth";

export default function handler(req, res) {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.status(200).json({ role: user.role, name: user.name });
}
