.DEFAULT_GOAL := help
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

COMPOSE ?= docker compose

.PHONY: help up down logs test ci lint api-install

help: ## Lista comandos
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN { FS = ":.*?## " } { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }'

up: ## Sobe api + web + postgres
	@test -f .env || cp .env.example .env
	$(COMPOSE) up -d --build

down: ## Para os containers
	$(COMPOSE) down

logs: ## Logs dos containers
	$(COMPOSE) logs -f

api-install: ## Instala deps Python da API (venv local)
	cd api && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

lint: ## Lint básico da API
	cd api && (test -d .venv && . .venv/bin/activate; python -m compileall app && python -m ruff check app tests || python -m compileall app)

test: ## Testes da API (SQLite em memória)
	cd api && (test -d .venv || python3 -m venv .venv) && \
		. .venv/bin/activate && pip install -q -U pip && pip install -q -r requirements.txt && \
		PYTHONPATH=. DATABASE_URL=sqlite+pysqlite:///:memory: pytest -q

ci: ## Lint + testes (igual CI)
	cd api && (test -d .venv || python3 -m venv .venv) && \
		. .venv/bin/activate && pip install -q -U pip && pip install -q -r requirements.txt && \
		python -m compileall app && \
		PYTHONPATH=. DATABASE_URL=sqlite+pysqlite:///:memory: pytest -q
