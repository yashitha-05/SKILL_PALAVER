from django.conf import settings
from django.db import models


class UploadedDataset(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="datasets",
    )
    name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    score = models.FloatField(default=0.0)
    metrics = models.JSONField(default=dict, blank=True)
    raw_csv = models.TextField()
    enhanced_csv = models.TextField(blank=True, null=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.score:.1f})"

