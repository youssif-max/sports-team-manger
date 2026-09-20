import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { signOut } from "@/lib/actions/user";
import type { User } from "@prisma/client";

export function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-[57px] max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🏆 TeamHub
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar name={user.name} photoUrl={user.photoUrl} size={28} />
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Switch
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
