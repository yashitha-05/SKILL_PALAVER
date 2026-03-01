
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .utils import analyze_data, enhance_data
from .models import DataFile
from django.conf import settings
import os

@api_view(['POST'])
def signup(request):
    username = request.data['username']
    password = request.data['password']
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": {"username": user.username}})

@api_view(['POST'])
def login(request):
    user = authenticate(username=request.data['username'], password=request.data['password'])
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": {"username": user.username}})
    return Response({"error":"Invalid credentials"}, status=400)

@api_view(['POST'])
def upload_file(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"detail": "No file provided."}, status=400)
    try:
        score, missing, duplicates = analyze_data(file)
    except ValueError as exc:
        # we raised ValueError for parsing issues
        return Response({"detail": str(exc)}, status=400)
    except Exception as exc:
        # unexpected error - log if necessary
        return Response({"detail": "Internal error processing file."}, status=500)

    return Response({
        "score": score,
        "missing": int(missing),
        "duplicates": int(duplicates)
    })

@api_view(['POST'])
def enhance(request):
    file = request.FILES['file']
    upload_path = os.path.join(settings.MEDIA_ROOT, "temp.csv")
    with open(upload_path, 'wb+') as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    output_path = os.path.join(settings.MEDIA_ROOT, "cleaned.csv")
    enhance_data(upload_path, output_path)
    return Response({"download_url": "/media/cleaned.csv"})
