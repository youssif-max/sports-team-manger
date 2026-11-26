// The app owner(s), allowed to review reported public highlights across all
// teams. Set PLATFORM_ADMIN_USER_IDS to a comma-separated list of user ids
// (ids rather than emails, so nobody can gain access by registering an email).
export function isPlatformAdmin(user: { id: string } | null | undefined): boolean {
  if (!user) return false;
  const ids = (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(user.id);
}
