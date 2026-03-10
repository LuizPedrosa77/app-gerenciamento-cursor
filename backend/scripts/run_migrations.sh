#!/bin/bash

# Script para rodar migrations do Alembic
# Uso: ./run_migrations.sh [up|down|revision]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando processo de migrations...${NC}"

# Verificar se estamos no diretório correto
if [ ! -f "alembic.ini" ]; then
    echo -e "${RED}❌ Erro: alembic.ini não encontrado. Execute este script do diretório backend.${NC}"
    exit 1
fi

# Verificar variáveis de ambiente
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  WARNING: DATABASE_URL não está definida. Usando valor padrão.${NC}"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gpfx"
fi

# Função para verificar se PostgreSQL está rodando
check_postgres() {
    echo -e "${YELLOW}🔍 Verificando conexão com PostgreSQL...${NC}"
    
    # Extrair host e porta do DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -z "$DB_HOST" ]; then
        DB_HOST="localhost"
    fi
    
    if [ -z "$DB_PORT" ]; then
        DB_PORT="5432"
    fi
    
    # Esperar PostgreSQL ficar disponível
    for i in {1..30}; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL está rodando${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Aguardando PostgreSQL... ($i/30)${NC}"
        sleep 2
    done
    
    echo -e "${RED}❌ PostgreSQL não ficou disponível após 60 segundos${NC}"
    exit 1
}

# Função para rodar migration
run_migration() {
    local direction=$1
    echo -e "${GREEN}📊 Rodando migration: alembic $direction${NC}"
    
    # Rodar migration
    alembic $direction
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration concluída com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro na migration!${NC}"
        exit 1
    fi
}

# Função para criar backup antes da migration
backup_database() {
    echo -e "${YELLOW}💾 Criando backup do banco antes da migration...${NC}"
    
    BACKUP_FILE="backup_before_migration_$(date +%Y%m%d_%H%M%S).sql"
    
    # Criar backup
    pg_dump $DATABASE_URL > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Erro ao criar backup!${NC}"
    fi
}

# Verificar argumentos
case "${1:-up}" in
    "up")
        echo -e "${GREEN}📈 Rodando migrations para cima...${NC}"
        check_postgres
        backup_database
        run_migration "upgrade head"
        ;;
    "down")
        echo -e "${YELLOW}📉 Rodando migration para baixo...${NC}"
        check_postgres
        run_migration "downgrade base"
        ;;
    "revision")
        echo -e "${GREEN}📝 Criando nova migration...${NC}"
        check_postgres
        alembic revision --autogenerate -m "${2:-Auto migration}"
        ;;
    "current")
        echo -e "${GREEN}📍 Versão atual do banco:${NC}"
        alembic current
        ;;
    "history")
        echo -e "${GREEN}📜 Histórico de migrations:${NC}"
        alembic history
        ;;
    "help"|"-h"|"--help")
        echo "Uso: $0 [comando] [opções]"
        echo ""
        echo "Comandos:"
        echo "  up        Roda todas as migrations pendentes (padrão)"
        echo "  down       Reverte a última migration"
        echo "  revision  Cria nova migration file"
        echo "  current   Mostra a versão atual"
        echo "  history   Mostra o histórico de migrations"
        echo "  help      Mostra esta ajuda"
        echo ""
        echo "Exemplos:"
        echo "  $0 up"
        echo "  $0 down"
        echo "  $0 revision 'Add new feature'"
        ;;
    *)
        echo -e "${RED}❌ Comando desconhecido: $1${NC}"
        echo "Use '$0 help' para ver os comandos disponíveis."
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Processo finalizado!${NC}"
