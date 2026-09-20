import Link from "next/link";

const TABS = [
  { href: "", label: "Overview", icon: "🏠" },
  { href: "/roster", label: "Roster", icon: "👥" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/standings", label: "Standings", icon: "🏆" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/highlights", label: "Highlights", icon: "🎬" },
];

export function TeamNav({ teamId }: { teamId: string }) {
  return (
    <nav className="sticky top-[57px] z-10 -mx-4 overflow-x-auto border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 sm:mx-0 sm:rounded-xl sm:border sm:px-2">
      <ul className="flex min-w-max gap-1 py-2 sm:min-w-0">
        {TABS.map((tab) => (
          <li key={tab.label}>
            <Link
              href={`/teams/${teamId}${tab.href}`}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
