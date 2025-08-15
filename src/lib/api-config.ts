// Configuração da API
export const API_CONFIG = {
  // URL base da API Python
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://192.168.100.194:8000",

  // Endpoints
  ENDPOINTS: {
    UPLOAD: "/api/upload",
    STATUS: "/api/process",
    DOWNLOAD: "/api/download",
    JOBS: "/api/jobs",
  },

  // Configurações de polling
  POLLING: {
    INTERVAL: 2000, // 2 segundos
    MAX_RETRIES: 150, // 5 minutos máximo (150 * 2s)
  },

  // Configurações de upload
  UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024 * 1024, // 5GB
    ACCEPTED_TYPES: ["video/mp4", "video/mov", "video/avi", "video/x-msvideo"],
    TIMEOUT: 600000, // 10 minutos para uploads grandes
    CHUNK_SIZE: 8192 * 1024, // 8MB chunks
  },
};

// Helper para construir URLs completas
export const buildApiUrl = (
  endpoint: string,
  params?: Record<string, string>
) => {
  const url = new URL(endpoint, API_CONFIG.BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};
