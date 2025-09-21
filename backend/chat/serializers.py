from rest_framework import serializers
from .models import Conversation


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['id', 'user', 'message_type', 'message_text', 'context_data', 'timestamp']
        read_only_fields = ['id', 'user', 'timestamp']
