"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AvailabilityPicker } from "./AvailabilityPicker";
import { RadioGroup, TextArea, TextInput } from "./Field";
import {
  CIVILITIES,
  REQUEST_TYPES,
  contactRequestSchema,
  type ContactRequest,
} from "@/lib/schema";

type Status =
  | { state: "idle" }
  | { state: "success"; id: number }
  | { state: "error"; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactRequest>({
    resolver: zodResolver(contactRequestSchema),
    // Errors appear once a field has been touched, then update as the user types.
    mode: "onTouched",
    defaultValues: {
      civility: undefined,
      lastName: "",
      firstName: "",
      email: "",
      phone: "",
      requestType: undefined,
      message: "",
      availabilities: [],
    },
  });

  async function onSubmit(values: ContactRequest) {
    setStatus({ state: "idle" });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({
          state: "error",
          message: payload?.error ?? "Une erreur est survenue. Merci de réessayer.",
        });
        return;
      }

      setStatus({ state: "success", id: payload.id });
      reset();
    } catch {
      setStatus({
        state: "error",
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      });
    }
  }

  if (status.state === "success") {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-400">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
            <path
              d="M4 12.5l5 5L20 6.5"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
          Message envoyé
        </h2>
        <p className="max-w-md text-sm text-white/80">
          Merci, votre demande (n°{status.id}) a bien été enregistrée. L’agence
          vous répond sous 48&nbsp;heures.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ state: "idle" })}
          className="mt-2 rounded-full bg-white/15 px-6 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25"
        >
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className="mb-7 text-2xl font-bold uppercase tracking-[0.06em] text-white sm:text-[28px]">
        Contactez l’agence
      </h1>

      <div className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
        {/* ---------------- Coordonnées ---------------- */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white">
            Vos coordonnées
          </h2>

          <Controller
            control={control}
            name="civility"
            render={({ field }) => (
              <RadioGroup
                legend="Civilité"
                name="civility"
                options={CIVILITIES}
                value={field.value}
                onChange={field.onChange}
                error={errors.civility?.message}
              />
            )}
          />

          <div className="mt-3 flex flex-col gap-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <TextInput
                id="lastName"
                label="Nom"
                placeholder="Nom"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register("lastName")}
              />
              <TextInput
                id="firstName"
                label="Prénom"
                placeholder="Prénom"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register("firstName")}
              />
            </div>
            <TextInput
              id="email"
              label="Adresse mail"
              type="email"
              inputMode="email"
              placeholder="Adresse mail"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextInput
              id="phone"
              label="Téléphone"
              type="tel"
              inputMode="tel"
              placeholder="Téléphone"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>
        </section>

        {/* ---------------- Message ---------------- */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white">
            Votre message
          </h2>

          <Controller
            control={control}
            name="requestType"
            render={({ field }) => (
              <RadioGroup
                legend="Motif de la demande"
                name="requestType"
                options={REQUEST_TYPES}
                value={field.value}
                onChange={field.onChange}
                error={errors.requestType?.message}
              />
            )}
          />

          <TextArea
            id="message"
            label="Votre message"
            rows={5}
            placeholder="Votre message"
            className="mt-3"
            error={errors.message?.message}
            {...register("message")}
          />
        </section>

        {/* ---------------- Disponibilités ---------------- */}
        <Controller
          control={control}
          name="availabilities"
          render={({ field }) => (
            <AvailabilityPicker
              value={field.value}
              onChange={field.onChange}
              error={errors.availabilities?.message}
            />
          )}
        />

        {/* ---------------- Envoi ---------------- */}
        <div className="flex flex-col items-stretch justify-end gap-3 lg:items-end lg:justify-start lg:self-start">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-full bg-amber-400 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70 lg:w-56"
          >
            {isSubmitting ? "Envoi…" : "Envoyer"}
          </button>

          {status.state === "error" && (
            <p role="alert" className="text-xs font-medium text-red-200 lg:text-right">
              {status.message}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
