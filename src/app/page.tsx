"use client";
import { useRef, useState, useEffect } from "react";
import Select from "@/components/Select";
import { API_CONFIG, buildApiUrl } from "@/lib/api-config";

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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [calibration, setCalibration] = useState<boolean>(false);
  const [modelChoice, setModelChoice] = useState<string>("diurno");
  const [maxFrames, setMaxFrames] = useState<number>(150); // 5 seconds default (5 * 30fps)

  // Processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadCompleted, setDownloadCompleted] = useState<boolean>(false);
  const [pollingIntervalRef, setPollingIntervalRef] =
    useState<NodeJS.Timeout | null>(null);

  // Video cutting states
  const [enableVideoCutting, setEnableVideoCutting] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef) {
        clearInterval(pollingIntervalRef);
      }
    };
  }, [pollingIntervalRef]);

  // Get video duration when file is selected
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Cut video using Canvas and MediaRecorder (browser-based cutting)
  const cutVideoInBrowser = async (
    file: File,
    startSec: number,
    endSec: number
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        video.onloadedmetadata = () => {
          try {
            canvas.width = Math.min(video.videoWidth, 1920); // Limit resolution
            canvas.height = Math.min(video.videoHeight, 1080);

            const stream = canvas.captureStream(25); // 25 FPS for better performance

            // Check if MediaRecorder supports webm
            let mimeType = "video/webm;codecs=vp8";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "video/webm";
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "video/mp4";
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            const chunks: BlobPart[] = [];
            let recordingStarted = false;

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              try {
                const blob = new Blob(chunks, { type: mimeType });
                const fileExtension = mimeType.includes("webm")
                  ? ".webm"
                  : ".mp4";
                const cutFile = new File(
                  [blob],
                  file.name.replace(
                    /\.[^/.]+$/,
                    `_cut_${startSec}-${endSec}s${fileExtension}`
                  ),
                  {
                    type: mimeType,
                  }
                );
                resolve(cutFile);
              } catch (error) {
                reject(error);
              }
            };

            mediaRecorder.onerror = (event) => {
              reject(new Error("MediaRecorder error: " + event));
            };

            // Function to draw video frame to canvas
            const drawFrame = () => {
              if (video.paused || video.ended || video.currentTime >= endSec) {
                if (recordingStarted) {
                  mediaRecorder.stop();
                }
                return;
              }

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              requestAnimationFrame(drawFrame);
            };

            // Seek to start time
            video.currentTime = startSec;

            video.onseeked = () => {
              if (!recordingStarted && video.currentTime >= startSec) {
                recordingStarted = true;
                mediaRecorder.start(100); // Collect data every 100ms
                video.play();
                drawFrame();
              }
            };
          } catch (error) {
            reject(error);
          }
        };

        video.onerror = () =>
          reject(new Error("Erro ao carregar vídeo para corte"));
        video.crossOrigin = "anonymous";
        video.src = URL.createObjectURL(file);

        // Timeout fallback
        setTimeout(() => {
          reject(new Error("Timeout no corte de vídeo"));
        }, 60000); // 1 minute timeout
      } catch (error) {
        reject(error);
      }
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!videoFile) {
      setError("Selecione um vídeo primeiro");
      return;
    }

    if (selected.length === 0) {
      setError("Selecione pelo menos uma classe");
      return;
    }

    if (
      enableVideoCutting &&
      (startTime >= endTime || endTime > videoDuration)
    ) {
      setError("Tempo de corte inválido");
      return;
    }

    setError("");
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      let fileToUpload = videoFile;

      // Stage 0: Cut video if enabled
      if (enableVideoCutting && startTime < endTime) {
        setProcessingStage("Cortando vídeo no navegador...");
        setIsProcessingVideo(true);
        setProcessingProgress(5);

        try {
          fileToUpload = await cutVideoInBrowser(videoFile, startTime, endTime);
          setProcessingProgress(15);
          setProcessingStage("Vídeo cortado com sucesso");
        } catch (cutError) {
          console.warn("Erro ao cortar vídeo no navegador:", cutError);
          setError("Falha ao cortar vídeo. Enviando vídeo original...");
          // Continue com o vídeo original
        }

        setIsProcessingVideo(false);
      }

      // Stage 1: Upload and start processing
      setProcessingStage("Enviando vídeo e iniciando processamento...");
      setProcessingProgress(20);

      const formData = new FormData();
      formData.append("video", fileToUpload);
      formData.append("calibration", calibration ? "sim" : "nao");
      formData.append("model", modelChoice);
      formData.append("maxframes", maxFrames.toString());
      formData.append("classes", selected.join(","));

      console.log(
        `🔄 Iniciando upload de ${fileToUpload.name} (${(
          fileToUpload.size /
          (1024 * 1024)
        ).toFixed(2)} MB)`
      );

      const uploadResponse = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.UPLOAD),
        {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(API_CONFIG.UPLOAD.TIMEOUT), // 10 minutes timeout
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorDetail;

        try {
          const errorData = JSON.parse(errorText);
          errorDetail = errorData.detail || "Erro no upload";
        } catch {
          errorDetail = errorText || "Erro no upload";
        }

        console.error(
          `❌ Erro no upload: ${uploadResponse.status} - ${errorDetail}`
        );
        throw new Error(`Erro ${uploadResponse.status}: ${errorDetail}`);
      }

      const { id: newJobId } = await uploadResponse.json();
      setJobId(newJobId);
      setProcessingProgress(25);

      // Stage 2: Poll for completion
      await pollProcessingStatus(newJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      resetProcessingState();
    }
  }

  async function pollProcessingStatus(jobId: string) {
    setProcessingStage("Processando vídeo com IA...");

    // Limpar qualquer polling anterior
    if (pollingIntervalRef) {
      clearInterval(pollingIntervalRef);
    }

    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(
          buildApiUrl(API_CONFIG.ENDPOINTS.STATUS, { id: jobId })
        );
        const status = await statusResponse.json();

        console.log(`[Polling] Status atual:`, status);

        if (status.stage) {
          setProcessingStage(status.stage);
        }

        if (status.progress !== undefined) {
          setProcessingProgress(Math.min(status.progress, 90));
        }

        // Verificar se o processamento foi concluído
        if (status.status === "completed") {
          console.log(`[Polling] Processamento concluído!`);

          // Parar o polling imediatamente
          clearInterval(interval);
          setPollingIntervalRef(null);

          // Marcar como processamento concluído
          setDownloadCompleted(true);
          setProcessingProgress(100);
          setProcessingStage("Processamento concluído - Pronto para download");

          // Não fazer download automático, apenas mostrar o botão
        }

        if (status.status === "failed" || status.error) {
          clearInterval(interval);
          setPollingIntervalRef(null);
          throw new Error(status.error || "Erro no processamento");
        }
      } catch (err) {
        console.error(`[Polling] Erro:`, err);
        clearInterval(interval);
        setPollingIntervalRef(null);
        setError(err instanceof Error ? err.message : "Erro no status");
        resetProcessingState();
      }
    }, API_CONFIG.POLLING.INTERVAL);

    setPollingIntervalRef(interval);
  }

  function resetProcessingState() {
    setIsProcessing(false);
    setProcessingStage("");
    setProcessingProgress(0);
    setJobId("");
    setIsDownloading(false);
    setDownloadCompleted(false);
    setIsProcessingVideo(false);
    setError("");
    if (pollingIntervalRef) {
      clearInterval(pollingIntervalRef);
      setPollingIntervalRef(null);
    }
  }

  async function downloadProcessedVideo(jobId: string) {
    console.log(`[Download] Iniciando download para job ${jobId}`);

    setIsDownloading(true);
    setProcessingStage("Baixando arquivo...");

    try {
      const response = await fetch(
        buildApiUrl(API_CONFIG.ENDPOINTS.DOWNLOAD, { id: jobId })
      );

      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status}`);
      }

      console.log(`[Download] Download bem-sucedido`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${videoName.split(".")[0]}_processed.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProcessingStage("Download concluído!");
      console.log(`[Download] Arquivo baixado com sucesso`);

      // Mostrar mensagem sobre limpeza automática
      setTimeout(() => {
        setProcessingStage(
          "Arquivo baixado - Limpeza automática em progresso..."
        );
      }, 1000);

      // Reset após 6 segundos (tempo para limpeza no servidor)
      setTimeout(() => {
        resetProcessingState();
      }, 6000);
    } catch (error) {
      console.error(`[Download] Erro:`, error);
      setError("Falha no download");
      setIsDownloading(false);
      setProcessingStage("Erro no download - Tente novamente");
    }
  }
  function toggleClass(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Helper function to get time description from frames (30fps standard)
  function getTimeDescription(frames: number) {
    const seconds = frames / 30; // 30 FPS padrão
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  // Convert frames to seconds for slider (30fps standard)
  const maxSeconds = 600; // 10 minutes max
  const minSeconds = 5; // 5 seconds minimum (never 0)
  const currentSeconds = Math.max(minSeconds, maxFrames / 30); // Conversão exata para 30 FPS

  function handleSliderChange(seconds: number) {
    const adjustedSeconds = Math.max(minSeconds, seconds); // Ensure minimum 5 seconds
    setMaxFrames(adjustedSeconds * 30); // 30 frames por segundo
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
                Cut Media 1.1.4
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
                className={`relative block group border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
                  isProcessing
                    ? "border-white/10 cursor-not-allowed opacity-50"
                    : "border-white/20 cursor-pointer hover:border-[var(--brand)]/60 hover:bg-[var(--brand)]/5"
                }`}
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
                    {["MP4", "MOV", "AVI", "DAV"].map((format) => (
                      <span
                        key={format}
                        className="px-2 py-1 text-xs bg-white/10 text-muted rounded-md border border-white/10"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted/80">Tamanho máximo: 5 GB</p>
                  <p className="text-xs text-amber-400/80">
                    📹 Arquivos .DAV são suportados, mas o corte de vídeo pode
                    não funcionar
                  </p>
                </div>

                <input
                  id="video"
                  name="video"
                  type="file"
                  accept="video/*,.dav,.DAV"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoName(file.name);
                      setVideoFile(file);
                      setError(""); // Clear any previous errors

                      // Check if it's a DAV file
                      const isDavFile = file.name
                        .toLowerCase()
                        .endsWith(".dav");
                      if (isDavFile) {
                        setError(
                          "⚠️ Arquivo .DAV detectado: O corte de vídeo pode não funcionar corretamente com este formato. Recomendamos converter para MP4 primeiro."
                        );
                        setEnableVideoCutting(false); // Disable cutting for DAV files
                        setVideoDuration(0);
                        return;
                      }

                      // Get video duration (only for standard video formats)
                      try {
                        const duration = await getVideoDuration(file);
                        setVideoDuration(duration);
                        setEndTime(Math.min(duration, 60)); // Default to 60 seconds or full video
                      } catch (error) {
                        console.warn(
                          "Não foi possível obter duração do vídeo:",
                          error
                        );
                        setVideoDuration(0);
                        setEnableVideoCutting(false); // Disable cutting if duration detection fails
                      }
                    }
                  }}
                  required
                  disabled={isProcessing}
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
                    disabled={isProcessing}
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
                    disabled={isProcessing}
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
                  disabled={isProcessing}
                />
              </div>
            </div>
          </section>

          {/* Right column: Options */}
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4">Parâmetros</h2>
            <form ref={formRef} onSubmit={onSubmit} className="grid gap-5">
              <div>
                <label className="block text-sm text-muted mb-3">
                  Duração para processar
                </label>

                {/* Slider control */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-foreground font-medium">
                      {getTimeDescription(maxFrames)}
                    </span>
                    <span className="text-xs text-muted">
                      {Math.floor(currentSeconds / 60)}:
                      {String(Math.round(currentSeconds % 60)).padStart(2, "0")}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={minSeconds}
                    max={maxSeconds}
                    step="5"
                    value={currentSeconds}
                    onChange={(e) =>
                      handleSliderChange(parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                    disabled={isProcessing}
                  />

                  <div className="flex justify-between text-xs text-muted mt-2">
                    <span>0s</span>
                    <span>15m</span>
                    <span>30m</span>
                  </div>
                </div>

                {/* Visual feedback */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted">
                      Processamento limitado aos primeiros{" "}
                      {getTimeDescription(maxFrames)}
                    </span>
                    <span className="text-xs text-muted">
                      {maxFrames.toLocaleString()} frames
                    </span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand)] transition-all duration-300 ease-out"
                      style={{
                        width:
                          maxFrames === 0
                            ? "100%"
                            : `${Math.min(
                                (currentSeconds / maxSeconds) * 100,
                                100
                              )}%`,
                      }}
                    />
                  </div>

                  {maxFrames > 0 && (
                    <div className="mt-2 text-xs text-muted">
                      Processamento estimado: ~{Math.round(currentSeconds / 60)}{" "}
                      minuto(s) | 30 FPS
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted/80 mt-2">
                  📹 Range: 5 segundos - 10 minutos (ajuste de 5 em 5 segundos)
                </p>

                <input type="hidden" name="maxframes" value={maxFrames} />
              </div>

              {/* Video Cutting Section */}
              {videoDuration > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm text-muted">
                      Corte de vídeo (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setEnableVideoCutting(!enableVideoCutting)}
                      disabled={isProcessing}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        enableVideoCutting
                          ? "bg-[var(--brand)] text-white"
                          : "bg-white/10 text-muted hover:bg-white/20"
                      }`}
                    >
                      {enableVideoCutting ? "Habilitado" : "Desabilitado"}
                    </button>
                  </div>

                  {enableVideoCutting && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-400 mb-2">
                          ℹ️ O vídeo será cortado no navegador antes do envio
                        </p>
                        <p className="text-xs text-muted">
                          Duração total: {Math.floor(videoDuration / 60)}:
                          {String(Math.floor(videoDuration % 60)).padStart(
                            2,
                            "0"
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Início (segundos)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={Math.floor(videoDuration)}
                            value={startTime}
                            onChange={(e) =>
                              setStartTime(
                                Math.max(0, parseInt(e.target.value) || 0)
                              )
                            }
                            disabled={isProcessing}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:border-[var(--brand)]/50 focus:ring-1 focus:ring-[var(--brand)]/50 disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Fim (segundos)
                          </label>
                          <input
                            type="number"
                            min={startTime + 1}
                            max={Math.floor(videoDuration)}
                            value={endTime}
                            onChange={(e) =>
                              setEndTime(
                                Math.min(
                                  videoDuration,
                                  parseInt(e.target.value) || videoDuration
                                )
                              )
                            }
                            disabled={isProcessing}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-foreground focus:border-[var(--brand)]/50 focus:ring-1 focus:ring-[var(--brand)]/50 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="p-2 rounded bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Duração do corte:</span>
                          <span className="text-foreground font-medium">
                            {Math.floor((endTime - startTime) / 60)}:
                            {String(
                              Math.floor((endTime - startTime) % 60)
                            ).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        disabled={isProcessing}
                        className={`px-3 py-1.5 rounded-full border text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                {!isProcessing ? (
                  <>
                    <p className="text-xs text-muted">
                      {error ? (
                        <span className="text-red-400">{error}</span>
                      ) : (
                        "Configure os parâmetros e clique em processar"
                      )}
                    </p>
                    <button
                      type="submit"
                      disabled={!videoFile || selected.length === 0}
                      className="px-4 py-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Processar
                    </button>
                  </>
                ) : (
                  <div className="w-full">
                    {/* Processing status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground font-medium">
                        {processingStage}
                      </span>
                      <span className="text-xs text-muted">
                        {processingProgress}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--brand)] transition-all duration-500 ease-out"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>

                    {/* Processing details */}
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        {processingProgress < 100 && (
                          <div className="h-5 w-5 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"></div>
                        )}
                        {processingProgress === 100 && (
                          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                        <div className="text-xs text-muted flex-1">
                          <div>Job ID: {jobId || "Processando..."}</div>
                          <div>Arquivo: {videoName}</div>
                          <div>Classes: {selected.length} selecionadas</div>
                          {enableVideoCutting && (
                            <div>
                              Corte: {startTime}s - {endTime}s (
                              {Math.floor((endTime - startTime) / 60)}:
                              {String(
                                Math.floor((endTime - startTime) % 60)
                              ).padStart(2, "0")}
                              )
                            </div>
                          )}
                          {isProcessingVideo && (
                            <div className="text-yellow-400">
                              🎬 Cortando vídeo no navegador...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botão de download quando processamento estiver concluído */}
                      {processingProgress === 100 &&
                        downloadCompleted &&
                        !isDownloading && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="mb-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs text-yellow-400">
                                ⚠️ O job será automaticamente removido após o
                                download
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadProcessedVideo(jobId)}
                              disabled={isDownloading}
                              className="w-full px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              Baixar Vídeo Processado
                            </button>
                          </div>
                        )}

                      {/* Indicador de download em progresso */}
                      {isDownloading && (
                        <div className="mt-3 pt-3 border-t border-white/10 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs text-muted">
                            <div className="h-3 w-3 rounded-full border border-[var(--brand)] border-t-transparent animate-spin"></div>
                            Baixando arquivo...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
