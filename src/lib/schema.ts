import { z } from "zod";

/**
 * Shared between the client form and the API route so that validation rules
 * cannot drift between the two.
 */

export const CIVILITIES = [
  { value: "mme", label: "Mme" },
  { value: "m", label: "M" },
] as const;

export const REQUEST_TYPES = [
  { value: "visite", label: "Demande de visite" },
  { value: "rappel", label: "Être rappelé.e" },
  { value: "photos", label: "Plus de photos" },
] as const;

export const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

/** The agency takes visits between 7h and 20h. */
export const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
export const MINUTES = [0, 15, 30, 45];

export const availabilitySchema = z.object({
  day: z.enum(DAYS),
  hour: z.number().int().min(7).max(20),
  minute: z.number().int().refine((m) => MINUTES.includes(m), {
    message: "Minutes invalides",
  }),
});

export type Availability = z.infer<typeof availabilitySchema>;

/** "Lundi à 9h45" — used for the chips and for the confirmation summary. */
export function formatAvailability({ day, hour, minute }: Availability) {
  return `${day} à ${hour}h${String(minute).padStart(2, "0")}`;
}

/**
 * Phone is optional, but when the visitor asks to be called back we need a way
 * to reach them — enforced by the superRefine below.
 */
const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

export const contactRequestSchema = z
  .object({
    civility: z.enum(["mme", "m"], {
      message: "Merci de sélectionner une civilité",
    }),
    lastName: z
      .string()
      .trim()
      .min(1, "Le nom est requis")
      .max(80, "Le nom est trop long"),
    firstName: z
      .string()
      .trim()
      .min(1, "Le prénom est requis")
      .max(80, "Le prénom est trop long"),
    // Piped so an empty field reads "requise" rather than "invalide".
    email: z
      .string()
      .trim()
      .min(1, "L’adresse mail est requise")
      .max(150, "L’adresse mail est trop longue")
      .pipe(z.email("Adresse mail invalide")),
    phone: z
      .string()
      .trim()
      .max(20, "Le téléphone est trop long")
      .refine((v) => v === "" || phoneRegex.test(v), {
        message: "Numéro de téléphone invalide",
      }),
    requestType: z.enum(["visite", "rappel", "photos"], {
      message: "Merci de sélectionner un motif",
    }),
    message: z
      .string()
      .trim()
      .min(10, "Votre message doit faire au moins 10 caractères")
      .max(2000, "Votre message est trop long (2000 caractères maximum)"),
    availabilities: z
      .array(availabilitySchema)
      .max(10, "10 disponibilités maximum"),
  })
  .superRefine((data, ctx) => {
    if (data.requestType === "rappel" && data.phone === "") {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Un numéro est nécessaire pour être rappelé.e",
      });
    }
    if (data.requestType === "visite" && data.availabilities.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["availabilities"],
        message: "Ajoutez au moins une disponibilité pour une demande de visite",
      });
    }
  });

export type ContactRequest = z.infer<typeof contactRequestSchema>;
