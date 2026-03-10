# 🚀 GPFX - Deploy em Produção com Docker Swarm

## 📋 Visão Geral

Este documento descreve o processo completo de deploy da aplicação Gustavo Pedrosa FX em produção utilizando Docker Swarm com Traefik como reverse proxy.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Traefik (LB)                        │
│                    (SSL/TLS Termination)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼──────┐         ┌─────────▼────────┐
│   Frontend    │         │     Backend      │
│ (Nginx/React) │         │   (FastAPI)     │
│   Port: 80    │         │   Port: 8000    │
└───────────────┘         └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼───────────────────────────┐
        │            Data Layer                   │
        │  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
        │  │PostgreSQL│ │  Redis  │ │  MinIO  │ │
        │  │ :5432   │ │ :6379   │ │ :9000   │ │
        │  └─────────┘ └─────────┘ └─────────┘ │
        └─────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos

```
.
├── docker-compose.saas.yml          # Compose principal para produção
├── Dockerfile.frontend              # Dockerfile do frontend
├── backend/
│   ├── Dockerfile.prod              # Dockerfile do backend (produção)
│   └── .env.production.example     # Template de variáveis de ambiente
├── scripts/
│   ├── deploy.sh                   # Script de deploy automatizado
│   └── run_migrations.sh          # Script de migrations
├── .github/workflows/
│   └── deploy.yml                  # GitHub Actions CI/CD
└── nginx.conf                      # Configuração do Nginx
```

## 🔧 Pré-requisitos

### 1. Infraestrutura
- VPS com Ubuntu 20.04+ ou CentOS 8+
- Docker Engine instalado
- Docker Swarm inicializado
- Traefik configurado com certificados SSL
- Domínios configurados:
  - `fx.hubnexusai.com` (frontend)
  - `api.hubnexusai.com` (backend)
  - `minio.hubnexusai.com` (MinIO)

### 2. Configuração do Docker Swarm
```bash
# Inicializar Swarm (se ainda não estiver)
docker swarm init

# Verificar status
docker info | grep Swarm
```

### 3. Configuração do Traefik
```yaml
# Exemplo de configuração Traefik
version: "3.8"
services:
  traefik:
    image: traefik:v2.10
    networks:
      - traefik_public
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.network=traefik_public"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.tlschallenge=true"
      - "--certificatesresolvers.le.acme.email=admin@hubnexusai.com"
      - "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
```

## 🚀 Processo de Deploy

### 1. Configurar Variáveis de Ambiente

Copiar e configurar o arquivo de ambiente:
```bash
cp backend/.env.production.example backend/.env.production
```

Editar as variáveis importantes:
```bash
# Gerar chaves seguras
SECRET_KEY=$(openssl rand -hex 32)
INTERNAL_API_KEY=$(openssl rand -hex 32)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Configurar
DATABASE_URL=postgresql://postgres:hub123nexusai@postgres:5432/saas_gerenciamento_fx
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

### 2. Deploy Automatizado (Recomendado)

Usar o script de deploy:
```bash
# Tornar executável
chmod +x scripts/deploy.sh

# Deploy para produção
./scripts/deploy.sh production

# Deploy para staging
./scripts/deploy.sh staging
```

### 3. Deploy Manual

```bash
# 1. Baixar imagens
docker-compose -f docker-compose.saas.yml pull

# 2. Parar serviços antigos
docker-compose -f docker-compose.saas.yml down

# 3. Iniciar novos serviços
docker-compose -f docker-compose.saas.yml up -d

# 4. Aguardar saúde dos serviços
docker-compose -f docker-compose.saas.yml ps

# 5. Rodar migrations
docker-compose -f docker-compose.saas.yml exec backend bash -c "cd /app && ./scripts/run_migrations.sh up"
```

## 🔄 CI/CD com GitHub Actions

### 1. Configurar Secrets no GitHub

No repositório GitHub, configurar os seguintes secrets:
- `DOCKER_USERNAME`: Usuário do Docker Hub
- `DOCKER_PASSWORD`: Senha do Docker Hub
- `HOST`: IP da VPS
- `USERNAME`: Usuário SSH da VPS
- `SSH_KEY`: Chave SSH privada
- `PORT`: Porta SSH (padrão: 22)
- `SECRET_KEY`: Chave secreta da aplicação
- `INTERNAL_API_KEY`: Chave interna da API
- `OPENAI_API_KEY`: Chave da OpenAI
- `MINIO_ACCESS_KEY`: Access key do MinIO
- `MINIO_SECRET_KEY`: Secret key do MinIO
- `N8N_WEBHOOK_URL`: URL do webhook n8n

### 2. Workflow Automático

O workflow `.github/workflows/deploy.yml` é acionado automaticamente:
- **Push para `main`**: Deploy automático em produção
- **Tags**: Deploy da versão específica
- **Manual**: Deploy sob demanda via interface do GitHub

### 3. Processo do CI/CD

1. **Testes**: Executa testes unitários e de integração
2. **Build**: Cria imagens Docker para frontend e backend
3. **Push**: Envia imagens para Docker Hub
4. **Deploy**: Conecta na VPS e faz deploy
5. **Health Check**: Verifica se aplicação está saudável
6. **Rollback**: Em caso de falha, reverte para versão anterior
7. **Notificação**: Envia status via Telegram

## 📊 Monitoramento e Logs

### 1. Verificar Status dos Serviços
```bash
# Status geral
docker-compose -f docker-compose.saas.yml ps

# Logs específicos
docker-compose -f docker-compose.saas.yml logs frontend
docker-compose -f docker-compose.saas.yml logs backend
docker-compose -f docker-compose.saas.yml logs postgres
```

### 2. Health Checks
```bash
# Frontend
curl -f https://fx.hubnexusai.com/health

# Backend
curl -f https://api.hubnexusai.com/health

# Database
curl -f https://api.hubnexusai.com/health/db
```

### 3. Métricas de Recursos
```bash
# Uso de CPU/Memória
docker stats

# Espaço em disco
df -h

# Uso de rede
docker network ls
```

## 🗄️ Backup e Restauração

### 1. Backup Automático
O sistema cria backups automáticos:
- **Diário**: Backup completo do banco de dados
- **Semanal**: Backup de todos os volumes
- **Retenção**: 30 dias

### 2. Backup Manual
```bash
# Backup do PostgreSQL
docker-compose -f docker-compose.saas.yml exec postgres pg_dump -U postgres saas_gerenciamento_fx > backup.sql

# Backup de volumes
docker run --rm -v gpfx-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

### 3. Restauração
```bash
# Parar serviços
docker-compose -f docker-compose.saas.yml down

# Restaurar volumes
docker run --rm -v gpfx-postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data .

# Iniciar serviços
docker-compose -f docker-compose.saas.yml up -d

# Restaurar banco se necessário
docker-compose -f docker-compose.saas.yml exec postgres psql -U postgres -d saas_gerenciamento_fx < backup.sql
```

## 🔧 Manutenção

### 1. Atualizar Imagens
```bash
# Baixar novas versões
docker-compose -f docker-compose.saas.yml pull

# Recrear serviços
docker-compose -f docker-compose.saas.yml up -d --force-recreate
```

### 2. Limpeza
```bash
# Limpar imagens antigas
docker image prune -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar sistema
docker system prune -f
```

### 3. Escalar Serviços
```bash
# Escalar backend para 2 réplicas
docker-compose -f docker-compose.saas.yml up -d --scale backend=2

# Escalar frontend para 2 réplicas
docker-compose -f docker-compose.saas.yml up -d --scale frontend=2
```

## 🚨 Troubleshooting

### 1. Problemas Comuns

#### Serviço não inicia
```bash
# Verificar logs
docker-compose -f docker-compose.saas.yml logs [serviço]

# Verificar variáveis de ambiente
docker-compose -f docker-compose.saas.yml config
```

#### Database connection failed
```bash
# Verificar se PostgreSQL está saudável
docker-compose -f docker-compose.saas.yml exec postgres pg_isready -U postgres

# Verificar conexão
docker-compose -f docker-compose.saas.yml exec backend python -c "from app.core.database import engine; engine.connect()"
```

#### SSL/TLS Issues
```bash
# Verificar certificados Let's Encrypt
docker exec traefik ls /letsencrypt/

# Renovar certificados manualmente
docker-compose -f docker-compose.traefik.yml restart traefik
```

### 2. Performance

#### Otimização do PostgreSQL
```sql
-- Verificar queries lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analisar performance
EXPLAIN ANALYZE SELECT * FROM trades WHERE account_id = 'uuid';
```

#### Otimização do Nginx
```bash
# Verificar configuração
docker-compose -f docker-compose.saas.yml exec frontend nginx -t

# Recarregar configuração
docker-compose -f docker-compose.saas.yml exec frontend nginx -s reload
```

## 📚 Documentação Adicional

- [API Documentation](https://api.hubnexusai.com/docs)
- [MinIO Console](https://minio.hubnexusai.com)
- [Traefik Dashboard](https://traefik.hubnexusai.com)
- [Repository](https://github.com/hubnexusai/gpfx)

## 🆘 Suporte

Em caso de problemas:
1. Verificar logs dos serviços
2. Consultar documentação da API
3. Abrir issue no repositório
4. Contatar suporte via email

---

## ✅ Checklist de Deploy

- [ ] Docker Swarm configurado
- [ ] Traefik com SSL configurado
- [ ] Domínios apontando para VPS
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets do GitHub configurados
- [ ] Backup realizado antes do deploy
- [ ] Health checks passando
- [ ] Monitoramento ativo
- [ ] Logs configurados
- [ ] Documentação atualizada

---

**🎉 Deploy configurado e pronto para produção!**
