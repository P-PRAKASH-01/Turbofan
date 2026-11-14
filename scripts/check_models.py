import joblib
import os

model_paths = [
    './models/scenario_heldout_classifier.joblib',
    './models/engine_heldout_classifier.joblib',
    './models/phases/phase2/rul_model.joblib'
]

for p in model_paths:
    print('==============================')
    print(f'Checking: {p}')
    if not os.path.exists(p):
        print('  File does not exist!')
        continue
    
    size_mb = os.path.getsize(p) / (1024 * 1024)
    print(f'  File size: {size_mb:.2f} MB')
    
    d = joblib.load(p)
    if isinstance(d, dict):
        print(f'  Dictionary Keys: {list(d.keys())}')
        for k, v in d.items():
            if hasattr(v, 'predict'):
                print(f'    Key "{k}": Model estimator -> {type(v).__name__}')
                if hasattr(v, 'classes_'):
                    print(f'      Classes ({len(v.classes_)}): {v.classes_}')
                if hasattr(v, 'n_features_in_'):
                    print(f'      Features count: {v.n_features_in_}')
            elif isinstance(v, (list, tuple)):
                print(f'    Key "{k}": {type(v).__name__} (length {len(v)})')
                if len(v) > 0:
                    print(f'      Sample: {v[:5]}')
            elif isinstance(v, dict):
                print(f'    Key "{k}": dict with {len(v)} entries (keys: {list(v.keys())[:5]})')
            else:
                print(f'    Key "{k}": {type(v).__name__} = {v}')
    else:
        print(f'  Direct object: {type(d)}')
        if hasattr(d, 'predict'):
            print(f'    Estimator: {type(d).__name__}')
            if hasattr(d, 'classes_'):
                print(f'    Classes: {d.classes_}')
