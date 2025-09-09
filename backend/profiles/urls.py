from django.urls import path, include
from rest_framework import routers
from .views import UserProfileViewSet, UserProfileDetailView

router = routers.DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='userprofile')

urlpatterns = [
    path('', include(router.urls)),
    path('users/<uuid:user_id>/profile/', UserProfileDetailView.as_view(), name='user-profile-detail'),
]
