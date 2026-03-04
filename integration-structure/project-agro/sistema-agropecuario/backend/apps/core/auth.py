from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.utils.translation import gettext_lazy as _
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import CustomTokenObtainPairSerializer, UserSerializer


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    View para obter tokens de acesso e refresh.
    Aceita username/email e password.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenRefreshView(TokenRefreshView):
    """
    View para renovar token de acesso usando refresh token.
    """
    permission_classes = [AllowAny]


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """
    View para fazer logout invalidando o refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"detail": "Logout realizado com sucesso."}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"detail": "Token inválido."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "Erro ao fazer logout."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def user_profile(request):
    """
    Retorna os dados do usuário autenticado.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def register(request):
    """
    Endpoint para registro de novos usuários.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data['password'])
        user.save()

        # Gerar tokens automaticamente após registro
        refresh = RefreshToken.for_user(user)
        update_last_login(None, user)

        # Return tokens at top-level for consistency with the login endpoint
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)