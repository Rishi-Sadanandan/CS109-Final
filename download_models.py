import os
import urllib.request
import shutil
import json

# Create models directory if it doesn't exist
os.makedirs('static/models', exist_ok=True)

# Base URL for face-api.js models
base_url = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

# Models to download
models = [
    # Tiny Face Detector
    'tiny_face_detector_model-shard1',
    'tiny_face_detector_model-weights_manifest.json',
    
    # Face Expression Recognition
    'face_expression_model-shard1',
    'face_expression_model-weights_manifest.json'
]

# Download each model
for model in models:
    url = f"{base_url}/{model}"
    output_path = f"static/models/{model}"
    
    print(f"Downloading {model}...")
    try:
        with urllib.request.urlopen(url) as response, open(output_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
        print(f"Downloaded {model} successfully.")
    except Exception as e:
        print(f"Error downloading {model}: {e}")

# Fix manifest files to use local paths
for manifest_file in ['tiny_face_detector_model-weights_manifest.json', 'face_expression_model-weights_manifest.json']:
    manifest_path = f"static/models/{manifest_file}"
    try:
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Update paths to be relative
            for item in manifest:
                if 'paths' in item:
                    item['paths'] = [os.path.basename(path) for path in item['paths']]
            
            # Write updated manifest
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f)
            
            print(f"Updated {manifest_file} with local paths.")
    except Exception as e:
        print(f"Error updating {manifest_file}: {e}")

print("Model download complete. You can now run the application.") 