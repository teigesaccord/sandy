from django.urls import path, include
from rest_framework import routers
from .views import RecommendationViewSet

router = routers.DefaultRouter()
router.register(r'', RecommendationViewSet, basename='recommendation')

urlpatterns = [
	path('', include(router.urls)),
	path('users/<uuid:user_id>/', include((router.urls, 'recommendations'))),
]
