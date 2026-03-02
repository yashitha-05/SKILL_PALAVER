from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UploadedDataset


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
        )
        return user


class DatasetSummarySerializer(serializers.ModelSerializer):
    enhanced_csv = serializers.SerializerMethodField()

    class Meta:
        model = UploadedDataset
        fields = ["id", "name", "score", "metrics", "uploaded_at", "enhanced_csv", "raw_csv"]

    def get_enhanced_csv(self, obj):
        return bool(obj.enhanced_csv)


class DatasetDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDataset
        fields = [
            "id",
            "name",
            "score",
            "metrics",
            "uploaded_at",
            "enhanced_csv",
            "raw_csv",
        ]

