import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated {updated}</p>
      </div>
      <div className="prose-legal flex flex-col gap-5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800">
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/cookies" className="hover:underline">
          Cookie Policy
        </Link>
      </div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {heading}
      </h2>
      {children}
    </section>
  );
}
