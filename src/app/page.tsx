"use client";
import { useRef, useState } from "react";
import Select from "@/components/Select";

const classesList = [
  { id: 0, label: "Carro" },
  { id: 1, label: "Pesados" },
  { id: 2, label: "Moto" },
  { id: 3, label: "Van" },
  { id: 4, label: "Ônibus" },
  { id: 5, label: "Roda" },
  { id: 6, label: "Pessoa" },
  { id: 7, label: "Bicicleta" },
  { id: 8, label: "Carretinha" },
  { id: 9, label: "Tandem Duplo" },
  { id: 10, label: "Tandem Triplo" },
  { id: 11, label: "Tandem Quadruplo" },
  { id: 12, label: "Eixo Suspenso" },
];

const yoloOptions = [
  // Diurno
  { value: "diurno", label: "Diurno (Padrão)" },
  { value: "diurnoangulado", label: "Diurno (Angulado)" },
  // Noturno
  { value: "noturno", label: "Noturno (Padrão)" },
  { value: "noturnoangulado", label: "Noturno (Angulado)" },
  { value: "noturnoiluminado", label: "Noturno (Iluminado)" },
];

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [videoName, setVideoName] = useState<string>("");
  const [calibration, setCalibration] = useState<boolean>(false);
  const [modelChoice, setModelChoice] = useState<string>("diurno");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert(
      "Somente UI ativa. Integração com processamento será adicionada depois."
    );
  }

  function toggleClass(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="min-h-screen w-full">
      <header className="px-6 pt-10 pb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--brand)]/15 border border-white/10 grid place-items-center">
              <div className="h-4 w-4 rounded-sm bg-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Cut Media
              </h1>
              <p className="text-xs text-muted">IA Video Trimmer</p>
            </div>
          </div>
          <nav className="text-sm text-muted">UI Preview</nav>
        </div>
      </header>

      <main className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-start">
          {/* Left column: Dropzone + Details */}
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-6">Selecionar vídeo</h2>

            {/* Video dropzone */}
            <div className="mb-6">
              <label
                htmlFor="video"
                className="relative block group border-2 border-dashed border-white/20 rounded-2xl p-8 cursor-pointer text-center hover:border-[var(--brand)]/60 hover:bg-[var(--brand)]/5 transition-all duration-200"
              >
                <div className="flex flex-col items-center gap-4">
                  {/* Icon */}
                  <div className="h-12 w-12 rounded-xl bg-[var(--brand)]/15 border border-[var(--brand)]/30 grid place-items-center group-hover:bg-[var(--brand)]/25 group-hover:border-[var(--brand)]/50 transition-colors">
                    <svg
                      className="h-6 w-6 text-[var(--brand)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  {/* Text */}
                  <div>
                    <p className="text-base font-medium text-foreground mb-1">
                      Arraste seu vídeo aqui
                    </p>
                    <p className="text-sm text-muted">
                      ou{" "}
                      <span className="text-[var(--brand)] group-hover:text-[var(--brand-600)]">
                        clique para procurar
                      </span>
                    </p>
                  </div>

                  {/* File formats */}
                  <div className="flex gap-2 mt-2">
                    {["MP4", "MOV", "AVI"].map((format) => (
                      <span
                        key={format}
                        className="px-2 py-1 text-xs bg-white/10 text-muted rounded-md border border-white/10"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted/80">Tamanho máximo: 1 GB</p>
                </div>

                <input
                  id="video"
                  name="video"
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) =>
                    setVideoName(e.target.files?.[0]?.name ?? "")
                  }
                  required
                />
              </label>

              {/* Selected file indicator */}
              {videoName && (
                <div className="mt-4 p-3 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[var(--brand)]/20 grid place-items-center flex-shrink-0">
                      <svg
                        className="h-4 w-4 text-[var(--brand)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {videoName}
                      </p>
                      <p className="text-xs text-muted">Arquivo selecionado</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label
                  id="calibration-label"
                  className="block text-sm text-muted mb-2"
                >
                  Calibração
                </label>
                <div
                  className="segmented w-full"
                  role="group"
                  aria-labelledby="calibration-label"
                >
                  <button
                    type="button"
                    className={`segmented-btn text-sm flex-1 ${
                      !calibration ? "active" : ""
                    }`}
                    aria-pressed={!calibration}
                    onClick={() => setCalibration(false)}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn text-sm flex-1 ${
                      calibration ? "active" : ""
                    }`}
                    aria-pressed={calibration}
                    onClick={() => setCalibration(true)}
                  >
                    Sim
                  </button>
                </div>
                <input
                  type="hidden"
                  name="calibration"
                  value={calibration ? "sim" : "nao"}
                />
              </div>
              <div>
                <label
                  id="yolo-label"
                  className="block text-sm text-muted mb-2"
                >
                  Modelo YOLO
                </label>
                <Select
                  ariaLabel="Modelo YOLO"
                  value={modelChoice}
                  onChange={setModelChoice}
                  options={yoloOptions}
                />
              </div>
            </div>
          </section>

          {/* Right column: Options */}
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4">Parâmetros</h2>
            <form ref={formRef} onSubmit={onSubmit} className="grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">
                    FPS (0 = detectar)
                  </label>
                  <input
                    name="fps"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className="field ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">
                    Máx. frames (0 = ilimitado)
                  </label>
                  <input
                    name="maxframes"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className="field ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Classes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classesList.map((c) => {
                    const active = selected.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClass(c.id)}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                          active
                            ? "bg-[var(--brand)] text-white border-transparent"
                            : "bg-white/5 text-foreground/90 border-white/10 hover:border-[var(--brand)]/40"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="hidden"
                  name="classes"
                  value={selected.join(",")}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted">
                  Esta é uma prévia somente UI. O processamento será conectado
                  depois.
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-600)] transition-colors"
                >
                  Processar
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
