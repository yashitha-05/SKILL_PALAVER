
from django.urls import path
from .views import signup, login, upload_file, enhance

urlpatterns = [
    path('signup/', signup),
    path('login/', login),
    path('upload/', upload_file),
    path('enhance/', enhance),
]
