from django.core.management.base import BaseCommand
from django.utils import timezone
from api.report_service import process_monthly_auto_reports

class Command(BaseCommand):
    help = "Runs monthly auto report generation for classes matching today's auto report date"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force generate reports for all classes regardless of tanggal_auto_report match'
        )
        parser.add_argument(
            '--kelas-id',
            type=int,
            default=None,
            help='Run auto report for a specific class ID only'
        )

    def handle(self, *args, **options):
        force = options['force']
        kelas_id = options['kelas_id']
        today = timezone.localtime(timezone.now()).date()

        self.stdout.write(f"Menjalankan auto report pada tanggal: {today} (Hari ke-{today.day})...")
        
        result = process_monthly_auto_reports(target_date=today, kelas_id=kelas_id, force=force)

        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai! {result['total_classes_processed']} kelas diproses. "
                f"{result['total_tokens_created']} token baru dibuat, "
                f"{result['total_tokens_existing']} token sudah ada."
            )
        )
