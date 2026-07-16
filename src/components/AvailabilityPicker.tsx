"use client";

import { useState } from "react";
import { Select } from "./Field";
import {
  DAYS,
  HOURS,
  MINUTES,
  formatAvailability,
  type Availability,
} from "@/lib/schema";

type Props = {
  value: Availability[];
  onChange: (next: Availability[]) => void;
  error?: string;
};

const dayOptions = DAYS.map((day) => ({ value: day, label: day }));
const hourOptions = HOURS.map((hour) => ({ value: hour, label: `${hour}h` }));
const minuteOptions = MINUTES.map((minute) => ({
  value: minute,
  label: `${minute}m`,
}));

export function AvailabilityPicker({ value, onChange, error }: Props) {
  const [draft, setDraft] = useState<Availability>({
    day: "Lundi",
    hour: 7,
    minute: 0,
  });
  const [notice, setNotice] = useState<string>();

  const isDuplicate = value.some(
    (slot) =>
      slot.day === draft.day &&
      slot.hour === draft.hour &&
      slot.minute === draft.minute,
  );

  function addDraft() {
    if (isDuplicate) {
      setNotice("Cette disponibilité est déjà dans la liste.");
      return;
    }
    if (value.length >= 10) {
      setNotice("10 disponibilités maximum.");
      return;
    }
    setNotice(undefined);
    onChange([...value, draft]);
  }

  function removeAt(index: number) {
    setNotice(undefined);
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white">
        Disponibilités pour une visite
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Jour"
          className="w-32"
          value={draft.day}
          onChange={(day) => setDraft({ ...draft, day: day as Availability["day"] })}
          options={dayOptions}
        />
        <Select
          label="Heure"
          className="w-20"
          value={draft.hour}
          onChange={(hour) => setDraft({ ...draft, hour: Number(hour) })}
          options={hourOptions}
        />
        <Select
          label="Minutes"
          className="w-20"
          value={draft.minute}
          onChange={(minute) => setDraft({ ...draft, minute: Number(minute) })}
          options={minuteOptions}
        />
        <button
          type="button"
          onClick={addDraft}
          className="ml-1 size-[52px] rounded-full bg-violet-700 text-[10px] font-bold uppercase leading-tight text-white transition hover:bg-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Ajouter
          <br />
          dispo
        </button>
      </div>

      {/* aria-live so removals/additions are announced without moving focus. */}
      <ul aria-live="polite" className="mt-3 flex flex-col gap-1.5">
        {value.map((slot, index) => (
          <li
            key={`${slot.day}-${slot.hour}-${slot.minute}`}
            className="flex w-52 items-center justify-between rounded-full bg-white/85 py-1.5 pl-4 pr-2 text-xs text-neutral-700"
          >
            {formatAvailability(slot)}
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={`Retirer ${formatAvailability(slot)}`}
              className="flex size-5 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-neutral-600"
            >
              <svg viewBox="0 0 10 10" aria-hidden="true" className="size-2.5">
                <path
                  d="M1 1l8 8M9 1l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {(notice || error) && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-200">
          {notice ?? error}
        </p>
      )}
    </div>
  );
}
