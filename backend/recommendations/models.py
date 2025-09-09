from django.db import models
from django.conf import settings
import uuid


class Recommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations')
    recommendation_type = models.CharField(max_length=100, null=True, blank=True)
    recommendation_data = models.JSONField()
    was_helpful = models.BooleanField(null=True)
    feedback = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recommendations'
        ordering = ['-timestamp']

    def __str__(self):
        return f"Recommendation {self.id} for {self.user_id}"


class UserInteraction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='interactions')
    interaction_type = models.CharField(max_length=50)
    interaction_data = models.JSONField(null=True, blank=True)
    success = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_interactions'
        ordering = ['-timestamp']

    def __str__(self):
        return f"Interaction {self.id} ({self.interaction_type})"
