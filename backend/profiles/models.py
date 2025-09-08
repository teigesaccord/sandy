from django.db import models
from django.conf import settings



class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    # Survey fields
    # Physical needs (multiselect)
    physical_needs = models.JSONField(default=list, blank=True)
    # Energy level
    energy_level = models.CharField(max_length=64, blank=True)
    # Main device
    main_device = models.CharField(max_length=64, blank=True)
    # Accessibility adaptations (multiselect)
    accessibility_adaptations = models.JSONField(default=list, blank=True)
    # Daily task challenges (multiselect)
    daily_task_challenges = models.JSONField(default=list, blank=True)
    # Willing to send photos
    send_photos = models.CharField(max_length=16, blank=True)
    # Disability/condition name (optional)
    condition_name = models.CharField(max_length=255, blank=True)
    # Help needed today (optional)
    help_needed = models.TextField(blank=True)
    # Willing to share product experiences
    share_experiences = models.CharField(max_length=16, blank=True)
    # Other needs soon (optional)
    other_needs_soon = models.TextField(blank=True)

    # Existing fields
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user_id}"
