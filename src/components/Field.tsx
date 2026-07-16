"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Shown under a control, and announced to screen readers via aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 pl-5 text-xs font-medium text-red-200">
      {message}
    </p>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

/**
 * The mockup has no visible labels — the placeholder carries the meaning.
 * We keep a real <label> in the accessibility tree instead of relying on it.
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ label, error, id, className = "", ...props }, ref) {
    const errorId = `${id}-error`;
    return (
      <div className={className}>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          {...props}
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-full bg-white px-5 text-sm text-neutral-800 shadow-sm outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-white/90 ${
            error ? "ring-2 ring-red-400" : ""
          }`}
        />
        <FieldError id={errorId} message={error} />
      </div>
    );
  },
);

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, id, className = "", ...props }, ref) {
    const errorId = `${id}-error`;
    return (
      <div className={className}>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          {...props}
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full resize-none rounded-3xl bg-white px-5 py-4 text-sm text-neutral-800 shadow-sm outline-none transition placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-white/90 ${
            error ? "ring-2 ring-red-400" : ""
          }`}
        />
        <FieldError id={errorId} message={error} />
      </div>
    );
  },
);

type RadioGroupProps<T extends string> = {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value?: T;
  onChange: (value: T) => void;
  error?: string;
};

/**
 * Custom-drawn radios: the native control stays in the DOM (keyboard + a11y)
 * but is visually replaced by the ring from the mockup.
 */
export function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps<T>) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="group flex cursor-pointer items-center gap-2 text-sm text-white"
          >
            <span className="relative flex size-4 items-center justify-center">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="peer size-4 cursor-pointer appearance-none rounded-full bg-white/95 outline-none ring-offset-0 transition focus-visible:ring-2 focus-visible:ring-white"
              />
              <span className="pointer-events-none absolute size-2 scale-0 rounded-full bg-violet-700 transition-transform peer-checked:scale-100" />
            </span>
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

type SelectProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string | number; label: string }>;
  className?: string;
};

/** Native <select> keeps mobile pickers and keyboard behaviour for free. */
export function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only" htmlFor={`select-${label}`}>
        {label}
      </label>
      <select
        id={`select-${label}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full cursor-pointer appearance-none rounded-full bg-white pl-4 pr-8 text-sm text-neutral-800 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-white/90"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3 top-1/2 size-2.5 -translate-y-1/2 fill-neutral-700"
      >
        <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}
