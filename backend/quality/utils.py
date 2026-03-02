from __future__ import annotations

from io import BytesIO, StringIO
from typing import Any, Dict, Tuple

import pandas as pd


def _load_dataframe(file_obj, filename: str) -> pd.DataFrame:
    file_obj.seek(0)
    lowered = filename.lower()
    if lowered.endswith(".csv"):
        return pd.read_csv(file_obj)
    if lowered.endswith(".xlsx"):
        content = file_obj.read()
        return pd.read_excel(BytesIO(content), engine="openpyxl")
    if lowered.endswith(".xls"):
        content = file_obj.read()
        try:
            return pd.read_excel(BytesIO(content), engine="xlrd")
        except ImportError:
            raise ValueError(
                "XLS format requires xlrd. Please save as XLSX or CSV."
            )
    raise ValueError("Unsupported file type. Please upload a CSV or Excel file.")


def compute_quality_score(df: pd.DataFrame) -> Tuple[float, Dict[str, Any]]:
    total_cells = df.size
    missing_cells = int(df.isna().sum().sum())
    completeness = 0.0 if total_cells == 0 else (1 - missing_cells / total_cells) * 100

    duplicate_rows = int(df.duplicated().sum())
    uniqueness = 0.0 if len(df) == 0 else (1 - duplicate_rows / len(df)) * 100

    # Very simple type-consistency proxy: how many columns are numeric vs mixed
    numeric_cols = df.select_dtypes(include=["number"]).columns
    mixed_type_columns = []
    for col in df.columns:
        if col in numeric_cols:
            non_numeric = df[col].apply(
                lambda x: isinstance(x, str) and x.strip() != ""
            ).sum()
            if non_numeric > 0:
                mixed_type_columns.append(col)

    type_consistency = (
        100.0
        if not mixed_type_columns
        else max(0.0, 100.0 - len(mixed_type_columns) * 10.0)
    )

    # Basic rule-of-thumb score
    score = round((0.5 * completeness + 0.3 * uniqueness + 0.2 * type_consistency), 1)

    issues = []
    if completeness < 95:
        issues.append("Dataset has missing values that may affect analysis.")
    if uniqueness < 95:
        issues.append("Dataset contains duplicate rows.")
    if mixed_type_columns:
        issues.append(
            f"Columns with inconsistent types: {', '.join(mixed_type_columns[:5])}"
        )

    # per-column diagnostics
    column_issues: dict[str, list[str]] = {}
    for col in df.columns:
        col_issues: list[str] = []
        missing = int(df[col].isna().sum())
        if missing > 0:
            col_issues.append(f"{missing} missing value{'' if missing == 1 else 's'}")
        # check numeric columns for non-numeric
        if pd.api.types.is_numeric_dtype(df[col]):
            non_numeric = df[col].apply(lambda x: isinstance(x, str) and x.strip() != "").sum()
            if non_numeric > 0:
                col_issues.append(f"{non_numeric} non-numeric entr{'' if non_numeric == 1 else 'ies'}")
        column_issues[col] = col_issues

    metrics = {
        "completeness": round(completeness, 1),
        "uniqueness": round(uniqueness, 1),
        "type_consistency": round(type_consistency, 1),
        "missing_cells": missing_cells,
        "total_cells": int(total_cells),
        "duplicate_rows": duplicate_rows,
        "mixed_type_columns": mixed_type_columns,
        "issues": issues,
        "column_issues": column_issues,
    }
    return score, metrics


def enhance_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    # Fill missing numeric values with column mean and categorical with mode
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].mean())
        else:
            if df[col].mode().empty:
                df[col] = df[col].fillna("Unknown")
            else:
                df[col] = df[col].fillna(df[col].mode()[0])

    # Drop duplicate rows
    df = df.drop_duplicates()

    score, metrics = compute_quality_score(df)
    return df, {"score": score, "metrics": metrics}


def parse_and_score(file_obj, filename: str) -> Tuple[pd.DataFrame, float, Dict[str, Any], str]:
    df = _load_dataframe(file_obj, filename)
    score, metrics = compute_quality_score(df)
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    return df, score, metrics, csv_buffer.getvalue()

