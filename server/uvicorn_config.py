# Configuração do Uvicorn para produção
# Para usar: uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 300 --limit-max-requests 1000

# Configurações para uploads grandes
client_max_body_size = 5368709120  # 5GB
timeout = 600  # 10 minutos
keep_alive = 300  # 5 minutos
workers = 1  # Para uploads grandes, evitar múltiplos workers

# Configurações de log
log_level = "info"
access_log = True

# Para desenvolvimento
reload = False

# Configurações de segurança
# SSL pode ser configurado aqui se necessário
