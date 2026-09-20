"use client";

import { useRef } from "react";

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  action,
  className,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <select
        name={name}
        defaultValue={defaultValue}
        className={className}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
