import sys, os
print('__file__:', __file__)
print('dirname:', os.path.dirname(os.path.abspath(__file__)))
print('parent:', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
print('sys.path[0]:', sys.path[0])
from app.main import app
print('OK')
