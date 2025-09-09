from rest_framework import viewsets, permissions
from .models import Recommendation
from .serializers import RecommendationSerializer


class RecommendationViewSet(viewsets.ModelViewSet):
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_id = self.kwargs.get('user_id') if hasattr(self, 'kwargs') else None
        if user.is_authenticated:
            if user_id and str(user.id) != str(user_id):
                return Recommendation.objects.none()
            return Recommendation.objects.filter(user=user).order_by('-timestamp')
        return Recommendation.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
