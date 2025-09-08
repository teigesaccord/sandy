from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 
            # Survey fields
            'physical_needs', 'energy_level', 'main_device',
            'accessibility_adaptations', 'daily_task_challenges',
            'send_photos', 'condition_name', 'help_needed',
            'share_experiences', 'other_needs_soon',
            # Profile fields
            'bio', 'avatar', 'location', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
