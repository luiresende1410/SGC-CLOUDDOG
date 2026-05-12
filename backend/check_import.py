import sys
sys.path.insert(0, '/app')
print('path:', sys.path[0])
import traceback
try:
    from app.main import app
    print('OK')
except Exception as e:
    traceback.print_exc()
