from django.urls import path, include
from rest_framework import routers
from .views import ConversationViewSet

router = routers.DefaultRouter()
router.register(r'', ConversationViewSet, basename='conversation')

urlpatterns = [
	path('', include(router.urls)),
	path('users/<uuid:user_id>/', include((router.urls, 'chat'))),
]
