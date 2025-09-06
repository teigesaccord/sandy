from rest_framework import viewsets, permissions
from .models import UserProfile
from .serializers import UserProfileSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions only to the profile owner
        return obj.user == request.user


class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        # Allow users to list only their own profile by default
        user = self.request.user
        if user.is_authenticated:
            return UserProfile.objects.filter(user=user)
        return UserProfile.objects.none()
