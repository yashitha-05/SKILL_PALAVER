from django.urls import path

from . import views

urlpatterns = [
    path("upload/", views.upload_dataset, name="upload-dataset"),
    path("datasets/", views.dataset_list, name="dataset-list"),
    path("datasets/<int:pk>/", views.dataset_detail, name="dataset-detail"),
    path("datasets/<int:pk>/claim/", views.claim_dataset, name="dataset-claim"),
    path(
        "datasets/<int:pk>/enhance/",
        views.enhance_view,
        name="dataset-enhance",
    ),
    path(
        "datasets/<int:pk>/download_enhanced/",
        views.download_enhanced,
        name="dataset-download-enhanced",
    ),
    path("dashboard/", views.dashboard_summary, name="dashboard-summary"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
]

