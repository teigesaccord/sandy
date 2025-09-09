from django.urls import path
from .views import MeAPIView, RegisterAPIView, LoginView, LogoutAPIView

urlpatterns = [
    path('me/', MeAPIView.as_view(), name='me'),
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
]
