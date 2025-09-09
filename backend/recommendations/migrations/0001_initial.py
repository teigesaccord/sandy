from django.conf import settings
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Recommendation',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('recommendation_type', models.CharField(max_length=100, null=True, blank=True)),
                ('recommendation_data', models.JSONField()),
                ('was_helpful', models.BooleanField(null=True)),
                ('feedback', models.TextField(null=True, blank=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='recommendations', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'recommendations', 'ordering': ['-timestamp']},
        ),
        migrations.CreateModel(
            name='UserInteraction',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ('interaction_type', models.CharField(max_length=50)),
                ('interaction_data', models.JSONField(null=True, blank=True)),
                ('success', models.BooleanField(default=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='interactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'user_interactions', 'ordering': ['-timestamp']},
        ),
    ]
