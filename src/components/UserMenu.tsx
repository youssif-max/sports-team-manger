"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, LifeBuoy, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { signOut } from "@/lib/actions/user";
import type { User } from "@prisma/client";

export function UserMenu({ user }: { user: Pick<User, "name" | "photoUrl" | "email"> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Avatar name={user.name} photoUrl={user.photoUrl} size={28} />
        <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
        <ChevronDown size={14} className="text-neutral-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <Avatar name={user.name} photoUrl={user.photoUrl} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              {user.email && (
                <p className="truncate text-xs text-neutral-500">{user.email}</p>
              )}
            </div>
          </div>

          <Divider />

          <MenuLink href="/account" onClick={() => setOpen(false)}>
            <Settings size={16} /> Account Settings
          </MenuLink>
          <MenuLink href="mailto:rennewiyoussif@sellabroad.io" onClick={() => setOpen(false)}>
            <LifeBuoy size={16} /> Help &amp; Support
          </MenuLink>

          <Divider />

          <div className="flex flex-wrap gap-x-3 gap-y-1 px-3.5 py-2 text-xs text-neutral-400">
            <Link href="/privacy" onClick={() => setOpen(false)} className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" onClick={() => setOpen(false)} className="hover:underline">
              Terms
            </Link>
            <Link href="/cookies" onClick={() => setOpen(false)} className="hover:underline">
              Cookies
            </Link>
          </div>

          <Divider />

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />;
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
    >
      {children}
    </Link>
  );
}
