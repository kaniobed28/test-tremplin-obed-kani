import Link from "next/link";
import { connection } from "next/server";
import { listContactRequests, type StoredRequest } from "@/lib/db";
import { formatAvailability, type Availability } from "@/lib/schema";

export const metadata = {
  title: "Demandes enregistrées",
  // Dans une vraie agence cette page serait derrière une authentification.
  // Ici elle est ouverte pour la démo, mais jamais indexée.
  robots: { index: false, follow: false },
};

const REQUEST_LABELS: Record<StoredRequest["request_type"], string> = {
  visite: "Demande de visite",
  rappel: "Être rappelé.e",
  photos: "Plus de photos",
};

const REQUEST_STYLES: Record<StoredRequest["request_type"], string> = {
  visite: "bg-[#3f1486] text-white",
  rappel: "bg-amber-400 text-white",
  photos: "bg-neutral-600 text-white",
};

/** MySQL stores UTC; the agency reads Paris time. */
function formatDate(value: string) {
  const date = new Date(value.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

export default async function DemandesPage() {
  // Read at request time: without this the page would be prerendered at build,
  // and always show the data as it was when the build ran.
  await connection();
  const requests = await listContactRequests();

  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-[0.06em] text-neutral-800">
              Demandes enregistrées
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {requests.length === 0
                ? "Aucune demande pour le moment."
                : `${requests.length} demande${requests.length > 1 ? "s" : ""}, de la plus récente à la plus ancienne.`}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50"
          >
            ← Retour au formulaire
          </Link>
        </header>

        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <strong>Page de démonstration.</strong> Elle sert à vérifier que les
          données sont bien enregistrées. Dans une vraie agence, ce back-office
          serait derrière une authentification — ici la démo est publique, donc
          n’y saisissez pas de vraies coordonnées.
        </p>

        {requests.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-neutral-500">
              Envoyez le formulaire : les demandes s’afficheront ici, relues
              directement depuis MySQL.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((request) => (
              <li
                key={request.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-semibold text-neutral-800">
                      {request.civility === "mme" ? "Mme" : "M"}{" "}
                      {request.first_name} {request.last_name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${REQUEST_STYLES[request.request_type]}`}
                    >
                      {REQUEST_LABELS[request.request_type]}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    #{request.id} · {formatDate(request.created_at)}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                  <a
                    href={`mailto:${request.email}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {request.email}
                  </a>
                  {request.phone && (
                    <a
                      href={`tel:${request.phone.replace(/\s/g, "")}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {request.phone}
                    </a>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                  {request.message}
                </p>

                {request.availabilities.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                      Disponibilités
                    </span>
                    {request.availabilities.map((slot, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600"
                      >
                        {formatAvailability(slot as Availability)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
