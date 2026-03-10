#!/bin/bash

# Script de deploy automático para VPS com Docker Swarm
# Uso: ./scripts/deploy.sh [staging|production]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuração
ENVIRONMENT=${1:-production}
PROJECT_NAME="gpfx"
DOCKER_COMPOSE_FILE="docker-compose.saas.yml"
BACKUP_DIR="/opt/backups/gpfx"
LOG_DIR="/var/log/gpfx"

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           🚀 GPFX - DEPLOYMENT SCRIPT v2.0                    ║"
echo "║                                                              ║"
echo "║    Gustavo Pedrosa FX - Trading Management System               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar ambiente
check_environment() {
    echo -e "${CYAN}🔍 Verificando ambiente...${NC}"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker não está instalado${NC}"
        exit 1
    fi
    
    # Verificar Docker Swarm
    if ! docker info | grep -q "Swarm: active"; then
        echo -e "${RED}❌ Docker Swarm não está ativo${NC}"
        echo -e "${YELLOW}⚠️  Execute: docker swarm init${NC}"
        exit 1
    fi
    
    # Verificar docker-compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ docker-compose não está instalado${NC}"
        exit 1
    fi
    
    # Verificar arquivo de compose
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Arquivo $DOCKER_COMPOSE_FILE não encontrado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Ambiente verificado com sucesso!${NC}"
}

# Criar diretórios necessários
setup_directories() {
    echo -e "${CYAN}📁 Criando diretórios...${NC}"
    
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $LOG_DIR
    sudo mkdir -p ./logs
    
    # Ajustar permissões
    sudo chown -R $USER:$USER $BACKUP_DIR
    sudo chown -R $USER:$USER $LOG_DIR
    sudo chown -R $USER:$USER ./logs
    
    echo -e "${GREEN}✅ Diretórios criados!${NC}"
}

# Backup do estado atual
backup_current() {
    echo -e "${YELLOW}💾 Criando backup do estado atual...${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/gpfx_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Backup de volumes Docker
    docker run --rm -v gpfx-postgres-data:/data -v $BACKUP_DIR:/backup \
        alpine tar czf /backup/postgres_data.tar.gz -C /data .
    
    docker run --rm -v gpfx-redis-data:/data -v $BACKUP_DIR:/backup \
        alpine tar czf /backup/redis_data.tar.gz -C /data .
    
    docker run --rm -v gpfx-minio-data:/data -v $BACKUP_DIR:/backup \
        alpine tar czf /backup/minio_data.tar.gz -C /data .
    
    # Compactar backup
    tar czf $BACKUP_FILE $BACKUP_DIR/*_data.tar.gz
    
    # Limpar arquivos temporários
    rm $BACKUP_DIR/*_data.tar.gz
    
    echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
}

# Carregar variáveis de ambiente
load_env() {
    echo -e "${CYAN}🔧 Carregando variáveis de ambiente...${NC}"
    
    if [ -f "backend/.env.production" ]; then
        export $(cat backend/.env.production | grep -v '^#' | xargs)
        echo -e "${GREEN}✅ Variáveis de ambiente carregadas!${NC}"
    else
        echo -e "${RED}❌ Arquivo backend/.env.production não encontrado${NC}"
        exit 1
    fi
}

# Pull das imagens
pull_images() {
    echo -e "${CYAN}📦 Baixando imagens Docker...${NC}"
    
    docker-compose -f $DOCKER_COMPOSE_FILE pull
    
    echo -e "${GREEN}✅ Imagens baixadas!${NC}"
}

# Deploy da aplicação
deploy_app() {
    echo -e "${PURPLE}🚀 Iniciando deploy...${NC}"
    
    # Parar serviços existentes
    echo -e "${YELLOW}⏹️ Parando serviços existentes...${NC}"
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # Limpar recursos antigos
    echo -e "${YELLOW}🧹 Limpando recursos antigos...${NC}"
    docker system prune -f
    
    # Iniciar novos serviços
    echo -e "${GREEN}▶️ Iniciando novos serviços...${NC}"
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    echo -e "${GREEN}✅ Deploy iniciado!${NC}"
}

# Aguardar serviços ficarem saudáveis
wait_for_health() {
    echo -e "${CYAN}⏳ Aguardando serviços ficarem saudáveis...${NC}"
    
    SERVICES=("postgres" "redis" "minio" "backend" "frontend")
    
    for service in "${SERVICES[@]}"; do
        echo -e "${YELLOW}🔍 Verificando $service...${NC}"
        
        timeout=300  # 5 minutos
        elapsed=0
        
        while [ $elapsed -lt $timeout ]; do
            if docker-compose -f $DOCKER_COMPOSE_FILE ps $service | grep -q "healthy"; then
                echo -e "${GREEN}✅ $service está saudável${NC}"
                break
            fi
            
            if [ $elapsed -eq $((timeout - 10)) ]; then
                echo -e "${RED}❌ $service não ficou saudável a tempo${NC}"
                echo -e "${YELLOW}📋 Logs de $service:${NC}"
                docker-compose -f $DOCKER_COMPOSE_FILE logs $service --tail 50
                exit 1
            fi
            
            sleep 10
            elapsed=$((elapsed + 10))
            echo -e "${YELLOW}⏳ Aguardando $service... ($elapsed/${timeout}s)${NC}"
        done
    done
    
    echo -e "${GREEN}✅ Todos os serviços estão saudáveis!${NC}"
}

# Rodar migrations
run_migrations() {
    echo -e "${CYAN}📊 Rodando migrations do banco...${NC}"
    
    docker-compose -f $DOCKER_COMPOSE_FILE exec backend bash -c "cd /app && ./scripts/run_migrations.sh up"
    
    echo -e "${GREEN}✅ Migrations concluídas!${NC}"
}

# Verificar aplicação
verify_deployment() {
    echo -e "${CYAN}🔍 Verificando deploy...${NC}"
    
    # Verificar se todos os containers estão rodando
    RUNNING_CONTAINERS=$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q | wc -l)
    TOTAL_CONTAINERS=$(docker-compose -f $DOCKER_COMPOSE_FILE config | grep -c 'image:')
    
    if [ $RUNNING_CONTAINERS -eq $TOTAL_CONTAINERS ]; then
        echo -e "${GREEN}✅ Todos os containers estão rodando!${NC}"
    else
        echo -e "${RED}❌ Alguns containers não estão rodando!${NC}"
        docker-compose -f $DOCKER_COMPOSE_FILE ps
        exit 1
    fi
    
    # Verificar health checks
    echo -e "${CYAN}🌐 Verificando endpoints...${NC}"
    
    # Frontend
    if curl -f -s http://localhost/health > /dev/null; then
        echo -e "${GREEN}✅ Frontend está respondendo${NC}"
    else
        echo -e "${RED}❌ Frontend não está respondendo${NC}"
        exit 1
    fi
    
    # Backend
    if curl -f -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✅ Backend está respondendo${NC}"
    else
        echo -e "${RED}❌ Backend não está respondendo${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Deploy verificado com sucesso!${NC}"
}

# Mostrar status final
show_status() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🎉 DEPLOY CONCLUÍDO COM SUCESSO!                   ║"
    echo "║                                                              ║"
    echo "║    🌐 Frontend: https://fx.hubnexusai.com                   ║"
    echo "║    🔌 Backend:  https://api.hubnexusai.com                   ║"
    echo "║    📊 MinIO:    https://minio.hubnexusai.com                 ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}📋 Status dos serviços:${NC}"
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo -e "${CYAN}📊 Uso de recursos:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Função principal
main() {
    echo -e "${GREEN}🚀 Iniciando deploy para $ENVIRONMENT...${NC}"
    
    # Executar passos
    check_environment
    setup_directories
    backup_current
    load_env
    pull_images
    deploy_app
    wait_for_health
    run_migrations
    verify_deployment
    show_status
    
    echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
}

# Trap para limpeza em caso de erro
trap 'echo -e "${RED}❌ Deploy falhou! Verifique os logs acima.${NC}"; exit 1' ERR

# Executar função principal
main "$@"
