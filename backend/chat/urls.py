from django.urls import path, include
from rest_framework import routers
from .views import ConversationViewSet

router = routers.DefaultRouter()
router.register(r'', ConversationViewSet, basename='conversation')

urlpatterns = [
    # Main chat endpoints: /api/chat/
    path('', include(router.urls)),
]