import sys
sys.path.insert(0, '/app')
print('Testing app.config...')
try:
    from app.config import settings
    print('config OK, db_url:', settings.database_url[:20])
except Exception as e:
    print('config FAIL:', type(e).__name__, str(e)[:200])
print('Testing app.database...')
try:
    from app.database import Base
    print('database OK')
except Exception as e:
    print('database FAIL:', type(e).__name__, str(e)[:200])
print('Testing app.main...')
try:
    from app.main import app
    print('main OK')
except Exception as e:
    import traceback
    traceback.print_exc()
