import json
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# If running from root, adjust
script_path = os.path.abspath("core/build_engine.py")
CMS_ROOT = os.path.dirname(os.path.dirname(script_path))
CONFIG_PATH = os.path.join(CMS_ROOT, 'data', 'config.json')

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

try:
    print(f"Loading config from {CONFIG_PATH}")
    config = load_json(CONFIG_PATH)
    print(f"Config Type: {type(config)}")
    if isinstance(config, dict):
        print("Config is dict. site_settings type:", type(config.get('site_settings', {})))
        print("sport_priorities type:", type(config.get('sport_priorities', {})))
    else:
        print("Config IS NOT A DICT")
        
except Exception as e:
    print(f"Error: {e}")
