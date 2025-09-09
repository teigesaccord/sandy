from django.db import models
from django.conf import settings
import uuid


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    message_type = models.CharField(max_length=20)
    message_text = models.TextField()
    context_data = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-timestamp']

    def __str__(self):
        return f"Conversation {self.id} ({self.message_type})"
