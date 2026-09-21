import Link from "next/link";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { signOut } from "@/lib/actions/user";
import type { User } from "@prisma/client";

export function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-[57px] max-w-5xl items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar name={user.name} photoUrl={user.photoUrl} size={28} />
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
