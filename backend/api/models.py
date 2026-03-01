
from django.db import models
from django.contrib.auth.models import User

class DataFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    original_file = models.FileField(upload_to='uploads/')
    cleaned_file = models.FileField(upload_to='cleaned/', null=True, blank=True)
    score = models.FloatField(default=0)
