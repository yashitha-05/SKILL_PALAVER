
import pandas as pd


def analyze_data(file):
    """Read an uploaded CSV/Excel file and compute basic metrics.

    Raises a ValueError if the file cannot be parsed. The caller should
    catch this and return an appropriate HTTP response.
    """
    # pandas will attempt to decode bytes according to utf-8 by default;
    # wrap in try/except to provide a clearer message back to the client.
    try:
        name = getattr(file, 'name', '')
        if name.lower().endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            df = pd.read_csv(file)
    except Exception as exc:
        raise ValueError(f"Failed to read data file: {exc}")

    missing = df.isnull().sum().sum()
    duplicates = df.duplicated().sum()
    score = 100 - (missing * 0.1) - (duplicates * 2)
    return round(score, 2), missing, duplicates

def enhance_data(input_path, output_path):
    df = pd.read_csv(input_path)
    df = df.drop_duplicates()
    df = df.fillna("N/A")
    df.to_csv(output_path, index=False)
