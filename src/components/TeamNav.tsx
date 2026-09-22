import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarCheck,
  Trophy,
  Megaphone,
  MessageCircle,
  Clapperboard,
  ClipboardList,
} from "lucide-react";

const TABS = [
  { href: "", label: "Overview", Icon: LayoutDashboard },
  { href: "/roster", label: "Roster", Icon: Users },
  { href: "/schedule", label: "Schedule", Icon: Calendar },
  { href: "/gamedays", label: "Game Days", Icon: CalendarCheck },
  { href: "/standings", label: "Standings", Icon: Trophy },
  { href: "/playbook", label: "Playbook", Icon: ClipboardList },
  { href: "/announcements", label: "Announcements", Icon: Megaphone },
  { href: "/chat", label: "Chat", Icon: MessageCircle },
  { href: "/highlights", label: "Highlights", Icon: Clapperboard },
];

export function TeamNav({ teamId }: { teamId: string }) {
  return (
    <nav className="sticky top-[57px] z-10 -mx-4 overflow-x-auto border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 sm:mx-0 sm:rounded-xl sm:border sm:px-2">
      <ul className="flex min-w-max gap-1 py-2 sm:min-w-0">
        {TABS.map(({ href, label, Icon }) => (
          <li key={label}>
            <Link
              href={`/teams/${teamId}${href}`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
