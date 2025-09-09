from django.urls import path
from .views import MeAPIView, RegisterAPIView, LoginView, LoginAPIView, LogoutAPIView

urlpatterns = [
    path('me/', MeAPIView.as_view(), name='me'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    # Use JSON API login view for clients (CSRF exempted in view)
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
]
