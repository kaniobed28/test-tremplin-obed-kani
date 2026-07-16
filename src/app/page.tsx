import Image from "next/image";
import { ContactForm } from "@/components/ContactForm";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 p-4 sm:p-8">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] shadow-2xl">
        {/* Decorative background: alt="" keeps it out of the a11y tree. */}
        <Image
          src="/salon.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover"
        />
        {/* Warm scrim: keeps the white controls readable over the photo. */}
        <div className="absolute inset-0 bg-[#4a342a]/75" />

        <div className="relative p-6 sm:p-10">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
