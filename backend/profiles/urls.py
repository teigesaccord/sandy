from django.urls import path, include
from rest_framework import routers
from .views import UserProfileViewSet

router = routers.DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='userprofile')

urlpatterns = [
    path('', include(router.urls)),
]
