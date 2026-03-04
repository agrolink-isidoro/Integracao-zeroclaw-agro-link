from django.urls import path
from rest_framework.response import Response
from rest_framework.decorators import api_view

@api_view(['GET'])
def return_200_with_code_403(request):
    # Simulate the anomalous response observed by the frontend
    return Response({'code': 403, 'detail': 'Forbidden (wrapped)'}, status=200)

urlpatterns = [
    path('test/forbidden-payload/', return_200_with_code_403),
]
