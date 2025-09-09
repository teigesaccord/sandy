from rest_framework import viewsets, permissions
from .models import Conversation
from .serializers import ConversationSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Allow optional URL-based user_id (e.g., /api/users/<user_id>/chat/)
        user_id = self.kwargs.get('user_id') if hasattr(self, 'kwargs') else None
        if user.is_authenticated:
            if user_id and str(user.id) != str(user_id):
                # Prevent access to other users' conversations
                return Conversation.objects.none()
            return Conversation.objects.filter(user=user).order_by('-timestamp')
        return Conversation.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
