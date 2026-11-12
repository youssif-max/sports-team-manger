"use client";

import { useActionState, useState, useTransition } from "react";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  type TwoFactorState,
} from "@/lib/actions/twofactor";

const input =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const primaryBtn =
  "self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60";
const secondaryBtn =
  "self-start rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800";

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="text-sm font-semibold">Save your recovery codes</p>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Each code works once if you lose your phone. They won&apos;t be shown again — store them
        somewhere safe, like a password manager.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(codes.join("\n")).catch(() => undefined)}
        className="self-start text-xs font-medium text-brand-600 hover:underline"
      >
        Copy codes
      </button>
    </div>
  );
}

export function TwoFactorSection({ enabled, available }: { enabled: boolean; available: boolean }) {
  const [setup, setSetup] = useState<TwoFactorState>();
  const [starting, startTransition] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState(confirmTwoFactorSetup, undefined);
  const [disableState, disableAction, disabling] = useActionState(disableTwoFactor, undefined);
  const [regenState, regenAction, regenerating] = useActionState(regenerateRecoveryCodes, undefined);

  if (!available && !enabled) {
    return (
      <p className="text-sm text-neutral-500">Two-step verification isn&apos;t available yet.</p>
    );
  }

  // Just finished setup: show the one-time recovery codes.
  if (confirmState?.recoveryCodes) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-green-600">{confirmState.message}</p>
        <RecoveryCodes codes={confirmState.recoveryCodes} />
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
            On
          </span>
          Signing in needs your password and a code from your authenticator app.
        </p>

        {regenState?.recoveryCodes ? (
          <>
            <p className="text-sm font-medium text-green-600">{regenState.message}</p>
            <RecoveryCodes codes={regenState.recoveryCodes} />
          </>
        ) : (
          <form action={regenAction} className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Password
              <input name="password" type="password" required autoComplete="current-password" className={input} />
            </label>
            {regenState?.error && <p className="text-sm font-medium text-red-600">{regenState.error}</p>}
            <button type="submit" disabled={regenerating} className={secondaryBtn}>
              {regenerating ? "Working..." : "Get new recovery codes"}
            </button>
          </form>
        )}

        <form action={disableAction} className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <p className="text-sm font-semibold">Turn off two-step verification</p>
          <label className="text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className={input} />
          </label>
          <label className="text-sm font-medium">
            Code from your app (or a recovery code)
            <input name="code" required autoComplete="one-time-code" className={input} />
          </label>
          {disableState?.error && <p className="text-sm font-medium text-red-600">{disableState.error}</p>}
          <button type="submit" disabled={disabling} className={secondaryBtn}>
            {disabling ? "Turning off..." : "Turn off"}
          </button>
        </form>
      </div>
    );
  }

  if (!setup?.secret) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Add a second step to signing in, so a stolen or guessed password isn&apos;t enough. You&apos;ll
          need an authenticator app such as Google Authenticator, 1Password or Authy. Recommended for
          coaches and admins, who can see players&apos; contact details.
        </p>
        {setup?.error && <p className="text-sm font-medium text-red-600">{setup.error}</p>}
        <button
          type="button"
          disabled={starting}
          className={primaryBtn}
          onClick={() => startTransition(async () => setSetup(await beginTwoFactorSetup()))}
        >
          {starting ? "Preparing..." : "Set up two-step verification"}
        </button>
      </div>
    );
  }

  return (
    <form action={confirmAction} className="flex flex-col gap-3">
      <p className="text-sm font-semibold">1. Scan this with your authenticator app</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URL */}
      {setup.qr && <img src={setup.qr} alt="Authenticator QR code" width={220} height={220} className="rounded-lg border border-neutral-200 bg-white" />}
      <p className="text-xs text-neutral-500">
        Can&apos;t scan? Enter this key manually:{" "}
        <span className="select-all break-all font-mono text-neutral-800 dark:text-neutral-200">{setup.secret}</span>
      </p>
      <p className="text-sm font-semibold">2. Enter the 6-digit code it shows</p>
      <input
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        className={input}
      />
      {confirmState?.error && <p className="text-sm font-medium text-red-600">{confirmState.error}</p>}
      <button type="submit" disabled={confirming} className={primaryBtn}>
        {confirming ? "Checking..." : "Turn on"}
      </button>
    </form>
  );
}
