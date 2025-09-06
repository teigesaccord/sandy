# Makefile for common development tasks

PYTHON=python3
VENV_DIR=backend/.venv
ACTIVATE=. $(VENV_DIR)/bin/activate

.PHONY: help venv install backend-up backend-down migrate createsuperuser runserver frontend-install frontend-run stop

help:
	@echo "Available targets: venv, install, backend-up, backend-down, migrate, createsuperuser, runserver, frontend-install, frontend-run, stop"

venv:
	$(PYTHON) -m venv $(VENV_DIR)
	$(ACTIVATE) && pip install --upgrade pip setuptools wheel

install: venv
	$(ACTIVATE) && pip install -r backend/requirements.txt

backend-up:
	docker-compose up -d db redis adminer

backend-down:
	docker-compose down

migrate:
	$(ACTIVATE) && cd backend && python manage.py makemigrations && python manage.py migrate

createsuperuser:
	$(ACTIVATE) && cd backend && python manage.py createsuperuser

runserver:
	$(ACTIVATE) && cd backend && python manage.py runserver 0.0.0.0:8000

frontend-install:
	cd src && npm install

frontend-run:
	cd src && npm run dev

stop:
	docker-compose stop
