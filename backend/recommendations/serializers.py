from rest_framework import serializers
from .models import Recommendation


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = ['id', 'user', 'recommendation_type', 'recommendation_data', 'was_helpful', 'feedback', 'timestamp']
        read_only_fields = ['id', 'timestamp']
