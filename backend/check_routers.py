import sys
sys.path.insert(0, '/app')
routers = ['auth', 'colaboradores', 'custos', 'relatorios', 'departamentos', 'parametros', 'tabela_salarial', 'usuarios', 'importacao']
for r in routers:
    try:
        mod = __import__('app.routers.' + r, fromlist=[r])
        print('OK:', r)
    except Exception as e:
        print('FAIL:', r, '->', e)
