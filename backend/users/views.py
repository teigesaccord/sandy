from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer that accepts email instead of username"""
    username_field = 'email'
    
    def validate(self, attrs):
        # Get email and password from the request
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Try to authenticate using email as username
            user = authenticate(username=email, password=password)
            if not user:
                # If that fails, try to find user by email and authenticate with username
                try:
                    user_obj = User.objects.get(email=email)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass
            
            if user and user.is_active:
                refresh = self.get_token(user)
                return {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
        
        # If authentication fails, raise validation error
        from rest_framework_simplejwt.exceptions import InvalidToken
        raise InvalidToken('No active account found with the given credentials')


class MeAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': str(user.id),
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
        return Response(data)


class RegisterAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email or not password:
            return Response({'detail': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            email=email,
            password=make_password(password),
            first_name=first_name,
            last_name=last_name
        )

        return Response({'id': str(user.id), 'email': user.email}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EmailTokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # For JWT, logout is client-side (delete tokens). Optionally, we can blacklist refresh tokens if configured.
        return Response({'detail': 'Logged out'}, status=status.HTTP_200_OK)


class DebugHeadersAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        headers = {}
        for key, value in request.META.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].replace('_', '-').lower()
                # Truncate auth token for security
                if 'authorization' in header_name:
                    value = value[:50] + '...' if len(value) > 50 else value
                headers[header_name] = value
        
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        return Response({
            'headers': headers,
            'has_auth_header': bool(auth_header),
            'auth_header_length': len(auth_header) if auth_header else 0,
            'content_type': request.META.get('CONTENT_TYPE'),
            'method': request.method,
            'path': request.path
        })


class SimpleTokenMeAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.GET.get('token')
        if not token:
            return Response({'error': 'No token provided'}, status=400)
            
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            validated_token = AccessToken(token)
            user_id = validated_token['user_id']
            
            user = User.objects.get(id=user_id)
            data = {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=401)
