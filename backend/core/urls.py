from django.urls import path
from . import views

urlpatterns = [
    path('health/', lambda request: None),
]
