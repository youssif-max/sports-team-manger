import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import type { User } from "@prisma/client";

export function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-[57px] max-w-5xl items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/join"
            title="Join a team"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Join a Team</span>
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
