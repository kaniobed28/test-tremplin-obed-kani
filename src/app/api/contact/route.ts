import { NextResponse } from "next/server";
import { z } from "zod";
import { insertContactRequest } from "@/lib/db";
import { contactRequestSchema } from "@/lib/schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  // Never trust the client: the same rules the form enforces are re-checked here.
  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Le formulaire contient des erreurs.",
        fields: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const id = insertContactRequest(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    // Log server-side, stay vague client-side.
    console.error("[POST /api/contact] insert failed", error);
    return NextResponse.json(
      { error: "Une erreur est survenue. Merci de réessayer." },
      { status: 500 },
    );
  }
}
