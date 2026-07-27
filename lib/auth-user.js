export function toAuthUser(user) {
  if (!user) return null;
  return {
    id: user._id?.toString ? user._id.toString() : String(user._id || user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
  };
}
