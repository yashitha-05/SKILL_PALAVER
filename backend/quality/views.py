from __future__ import annotations

from datetime import datetime

from django.contrib.auth import authenticate
from django.db.models.functions import TruncMonth
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Count
from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import UploadedDataset
from .serializers import (
    DatasetDetailSerializer,
    DatasetSummarySerializer,
    UserSerializer,
)
from .utils import enhance_dataset, parse_and_score


@csrf_exempt
@api_view(["POST"])
def upload_dataset(request):
    upload = request.FILES.get("file")
    if not upload:
        return Response(
            {"detail": "No file provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        _, score, metrics, raw_csv = parse_and_score(upload, upload.name)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {"detail": f"Could not read file: {exc!s}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    dataset = UploadedDataset.objects.create(
        user=request.user if request.user.is_authenticated else None,
        name=upload.name,
        score=score,
        metrics=metrics,
        raw_csv=raw_csv,
    )

    return Response(
        {
            "dataset": DatasetSummarySerializer(dataset).data,
            "issues": metrics.get("issues", []),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dataset_detail(request, pk: int):
    try:
        dataset = UploadedDataset.objects.get(pk=pk)
    except UploadedDataset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if dataset.user and dataset.user != request.user:
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = DatasetDetailSerializer(dataset)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def claim_dataset(request, pk: int):
    try:
        dataset = UploadedDataset.objects.get(pk=pk)
    except UploadedDataset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if dataset.user is not None:
        return Response(
            {"detail": "Dataset already claimed."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    dataset.user = request.user
    dataset.save()
    return Response({"detail": "Dataset claimed.", "dataset": DatasetSummarySerializer(dataset).data})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dataset_list(request):
    qs = UploadedDataset.objects.filter(user=request.user).order_by("-uploaded_at")
    return Response(DatasetSummarySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def enhance_view(request, pk: int):
    try:
        dataset = UploadedDataset.objects.get(pk=pk)
    except UploadedDataset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if dataset.user and dataset.user != request.user:
        return Response(status=status.HTTP_403_FORBIDDEN)

    import pandas as pd
    from io import StringIO

    df = pd.read_csv(StringIO(dataset.raw_csv))
    enhanced_df, result = enhance_dataset(df)

    from io import StringIO as _StringIO

    buff = _StringIO()
    enhanced_df.to_csv(buff, index=False)
    dataset.enhanced_csv = buff.getvalue()
    dataset.score = result["score"]
    dataset.metrics = result["metrics"]
    dataset.save()

    return Response(
        {
            "dataset": DatasetDetailSerializer(dataset).data,
            "download_url": f"/api/datasets/{dataset.pk}/download_enhanced/",
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def download_enhanced(request, pk: int):
    try:
        dataset = UploadedDataset.objects.get(pk=pk)
    except UploadedDataset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not dataset.enhanced_csv:
        return Response(
            {"detail": "Dataset has not been enhanced yet."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response = HttpResponse(dataset.enhanced_csv, content_type="text/csv")
    filename = dataset.name.rsplit(".", 1)[0] + "_enhanced.csv"
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _compute_check_breakdown(qs):
    correct_count = 0
    warning_count = 0
    error_count = 0
    fatal_count = 0
    for ds in qs:
        m = ds.metrics if isinstance(ds.metrics, dict) else {}
        comp = m.get("completeness", 100)
        uniq = m.get("uniqueness", 100)
        typ = m.get("type_consistency", 100)
        if comp >= 95:
            correct_count += 1
        else:
            warning_count += 1
        if uniq >= 95:
            correct_count += 1
        else:
            error_count += 1
        if typ >= 100:
            correct_count += 1
        else:
            fatal_count += 1
    total = correct_count + warning_count + error_count + fatal_count
    if total == 0:
        return {"correct": 0, "warnings": 0, "errors": 0, "fatal": 0}, {"correct_pct": 100, "warnings_pct": 0, "errors_pct": 0, "fatal_pct": 0}
    return (
        {"correct": correct_count, "warnings": warning_count, "errors": error_count, "fatal": fatal_count},
        {
            "correct_pct": round(100 * correct_count / total, 1),
            "warnings_pct": round(100 * warning_count / total, 1),
            "errors_pct": round(100 * error_count / total, 1),
            "fatal_pct": round(100 * fatal_count / total, 1),
        },
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_summary(request):
    qs = UploadedDataset.objects.filter(user=request.user)
    overall_score = qs.aggregate(avg=Avg("score"))["avg"] or 0.0
    total_datasets = qs.count()

    check_counts, check_pcts = _compute_check_breakdown(qs)

    monthly = (
        qs.annotate(month=TruncMonth("uploaded_at"))
        .values("month")
        .annotate(
            avg_score=Avg("score"),
            count=Count("id"),
        )
        .order_by("month")
    )

    monthly_payload = [
        {
            "month": datetime.strftime(row["month"], "%b %Y") if row["month"] else "",
            "avg_score": round(row["avg_score"] or 0.0, 1),
            "datasets": row["count"],
        }
        for row in monthly
    ]

    return Response(
        {
            "overall_score": round(overall_score, 1),
            "total_datasets": total_datasets,
            "check_counts": check_counts,
            "check_pcts": check_pcts,
            "monthly": monthly_payload,
        }
    )


@api_view(["POST"])
def register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": {"id": user.id, "username": user.username}})

