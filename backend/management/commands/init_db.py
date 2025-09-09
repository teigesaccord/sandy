from django.core.management.base import BaseCommand

from backend.services.postgresql_service import PostgreSQLService


class Command(BaseCommand):
    help = 'Initialize PostgreSQL tables used by the app'

    def handle(self, *args, **options):
        svc = PostgreSQLService()
        svc.initialize()
        self.stdout.write(self.style.SUCCESS('Database initialized'))
