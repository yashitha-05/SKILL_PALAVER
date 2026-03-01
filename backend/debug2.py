import traceback
from api.utils import analyze_data

for fname in ['bad.csv']:
    print('testing', fname)
    with open(fname, 'rb') as f:
        try:
            result = analyze_data(f)
            print('result', result)
        except Exception as e:
            print('caught', type(e).__name__, str(e))
            traceback.print_exc()
