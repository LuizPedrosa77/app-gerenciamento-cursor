# Gustavo Pedrosa FX - Backend API

API REST em FastAPI para o SaaS de trading Gustavo Pedrosa FX.

## Stack

- Python 3.11
- FastAPI
- SQLAlchemy + Alembic (PostgreSQL)
- JWT (autenticação)
- MinIO (armazenamento de screenshots)

## Desenvolvimento local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas configurações

# Rodar a API
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Docker

```bash
docker build -f backend/Dockerfile -t gpfx-backend .
docker run -p 8000:8000 --env-file backend/.env gpfx-backend
```

## Migrations

```bash
# Criar nova migration
alembic revision --autogenerate -m "descricao"

# Aplicar migrations
alembic upgrade head
```

## Estrutura

```
backend/
├── app/
│   ├── api/           # Routers e endpoints
│   ├── core/          # Config, DB, security, storage
│   ├── models/        # ORM
│   ├── schemas/       # Pydantic
│   ├── services/     # Lógica de negócio
│   ├── brokers/       # Adapters MT4/MT5/cTrader/etc
│   ├── websocket/     # Replay de mercado
│   └── tasks/         # Jobs / n8n
├── alembic/           # Migrations
├── requirements.txt
├── Dockerfile
└── .env.example
```
