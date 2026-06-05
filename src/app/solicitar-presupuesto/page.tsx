"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";

type City = {
  id: number;
  name: string;
};

const countryDialCodes = [
  { code: "+595", label: "Paraguay +595" },
  { code: "+54", label: "Argentina +54" },
  { code: "+55", label: "Brasil +55" },
  { code: "+598", label: "Uruguay +598" },
  { code: "+56", label: "Chile +56" },
  { code: "+591", label: "Bolivia +591" },
];

export default function ExternalBudgetRequestPage() {
  const [form, setForm] = useState({
    name: "",
    documentNumber: "",
    phoneCountryCode: "+595",
    phoneNumber: "",
    cityId: 1,
  });
  const [cities, setCities] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    fetch("/api/cities")
      .then((response) => response.json())
      .then((payload: { data?: City[] }) => {
        const nextCities = payload.data ?? [];
        setCities(nextCities);
        setForm((current) => ({
          ...current,
          cityId: nextCities[0]?.id ?? current.cityId,
        }));
      })
      .catch(() => setError("No se pudieron cargar las ciudades disponibles."));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/external-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("No se pudo registrar la solicitud.");
      }

      setForm({
        name: "",
        documentNumber: "",
        phoneCountryCode: "+595",
        phoneNumber: "",
        cityId: cities[0]?.id ?? 1,
      });
      setMessage("Solicitud enviada. Un operador de BoviTrans se comunicará contigo a la brevedad.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-100 text-zinc-950">
      <div className="flex justify-end px-5 pt-5">
        <Link
          aria-label="Ingreso interno BoviTrans"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
          href="/"
          title="Ingreso interno"
        >
          <User size={18} />
        </Link>
      </div>
      <section className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-3xl rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Image alt="BoviTrans" className="h-40 w-40 object-contain" height={180} priority src="/bovitrans-logo-transparent.png" width={180} />
            <h1 className="mt-4 text-2xl font-semibold">Solicitud de Presupuesto Logístico Ganadero</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Completa el formulario y un operador de BoviTrans se comunicará contigo a la brevedad.
            </p>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-zinc-700">
              Nombre / Razón Social
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="text-sm font-semibold text-zinc-700">
              Número de documento
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" placeholder="C.I. o RUC" value={form.documentNumber} onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))} />
            </label>
            <div className="grid gap-3 sm:grid-cols-[190px_1fr]">
              <label className="text-sm font-semibold text-zinc-700">
                Prefijo
                <select className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={form.phoneCountryCode} onChange={(event) => setForm((current) => ({ ...current, phoneCountryCode: event.target.value }))}>
                  {countryDialCodes.map((country) => (
                    <option key={country.code} value={country.code}>{country.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-zinc-700">
                Teléfono
                <input className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
              </label>
            </div>
            <label className="text-sm font-semibold text-zinc-700">
              Ciudad
              <select
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={form.cityId}
                onChange={(event) => setForm((current) => ({ ...current, cityId: Number(event.target.value) }))}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </label>

            {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}
            {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <button className="min-h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || cities.length === 0} type="submit">
              {busy ? "Enviando..." : "Solicitar Presupuesto"}
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white px-5 py-5 text-sm text-zinc-600">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-2"><Phone size={16} /> +595 971 897622</span>
            <span className="flex items-center gap-2"><Mail size={16} /> contacto@bovitrans.com.py</span>
            <span className="flex items-center gap-2"><MapPin size={16} /> Asunción, Paraguay</span>
          </div>
          <p className="font-semibold text-zinc-700">© 2026 BOVITRANS - Todos los derechos reservados.</p>
        </div>
      </footer>

      <a
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
        href={`https://wa.me/595971897622?text=${encodeURIComponent("Hola, me comunico desde la web de BoviTrans.")}`}
        rel="noopener noreferrer"
        target="_blank"
        title="WhatsApp BoviTrans"
      >
        <MessageCircle size={22} />
      </a>
    </main>
  );
}
