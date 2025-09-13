from django.urls import path
from .views import MeAPIView, RegisterAPIView, LoginView, LoginAPIView, LogoutAPIView, DebugHeadersAPIView, SimpleTokenMeAPIView
from profiles.views import UserProfileDetailView

urlpatterns = [
    path('me/', MeAPIView.as_view(), name='me'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    # Use JSON API login view for clients (CSRF exempted in view)
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('debug-headers/', DebugHeadersAPIView.as_view(), name='debug-headers'),
    path('simple-me/', SimpleTokenMeAPIView.as_view(), name='simple-me'),
    path('<int:user_id>/profile/', UserProfileDetailView.as_view(), name='user-profile'),
]
