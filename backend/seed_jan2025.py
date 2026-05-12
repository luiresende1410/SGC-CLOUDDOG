import sys
from decimal import Decimal
from datetime import date
from app.database import SessionLocal, engine
from app.models import Base, Departamento, Colaborador, RegistroCusto, ComponenteCusto

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── 1. DEPARTAMENTOS ──────────────────────────────────────────────────────────
dep_nomes = ["Desenvolvimento", "Comercial", "Marketing", "CoE", "Projetos", "Nuvem Gerenciada"]
deps = {}
for nome in dep_nomes:
    d = db.query(Departamento).filter(Departamento.nome == nome).first()
    if not d:
        d = Departamento(nome=nome)
        db.add(d)
        db.flush()
    deps[nome] = d.id
db.commit()
print("Departamentos criados:", deps)

# ── 2. DADOS DA PLANILHA ──────────────────────────────────────────────────────
# Formato: (data_mm_yyyy, nome, departamento, cargo, salario, remuneracao,
#           refeicao, transporte, seguro_saude, seguro_vida, fgts, gps,
#           equipamentos, escritorio, ferias, decimo_terceiro, fgts2, gps2,
#           multa_fgts, total)
# Usamos apenas os campos que o modelo suporta como componentes de custo.

def v(x):
    """Converte string monetária BR para float."""
    if not x or x in ("-", ""):
        return 0.0
    x = str(x).replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(x)
    except:
        return 0.0

# Cada linha: [mm/yyyy, nome, departamento, cargo, tipo_contrato_inferido, total, componentes_dict]
# tipo_contrato: se cargo == "PJ" -> PJ, senão CLT
# data_admissao: usamos 2020-01-01 como padrão pois não está na planilha

DADOS = [
# (mes, ano, nome, departamento, cargo, total, {componentes})
]

raw = """01/2025|André Lima|Desenvolvimento|PJ|15000|0|0|0|0|0|0|343.27|1762.59|0|0|0|0|0|17105.86
01/2025|Bruna Machado Vieira|Comercial|Consultor de Vendas Int Sr I|6035|660|0|0|32.70|482.80|1677.73|343.27|1762.59|653.79|502.92|92.54|321.56|18.41|12583.31
01/2025|Camila de Brito Oliveira|Comercial|Customer Success|3529.50|660|212|653.24|41.20|282.36|981.20|343.27|1762.59|382.36|294.13|54.12|188.06|10.77|9394.80
01/2025|Célio Rafael Silva D'Avila|CoE|Estagiário|3500|0|212|0|40.08|0|0|343.27|1762.59|291.67|0|0|0|0|6149.60
01/2025|Christian Francisco Giovannoni|Comercial|PJ|12250|0|0|0|0|0|0|343.27|1762.59|0|0|0|0|0|14355.86
01/2025|Daniella Fargnoli|Marketing|PJ|1500|0|0|0|0|0|0|343.27|1762.59|0|0|0|0|0|3605.86
01/2025|Dheric Tadeu da Silva|Projetos|Analista de Suporte Técnico Junior I|3353|660|187|479.83|28.42|268.24|932.13|343.27|1762.59|363.24|279.42|51.41|178.66|10.23|8897.44
01/2025|Everton Matheus Rodrigues Mendes|Desenvolvimento|Estagiário|2000|0|218.40|0|27.62|0|0|343.27|1762.59|166.67|0|0|0|0|4518.54
01/2025|Felipe da Silva Santos|Desenvolvimento|Programador de Sistemas Sr I|9248|616|210|390.12|58.08|739.84|2570.94|343.27|1762.59|1001.87|770.67|141.80|492.76|28.21|18374.16
01/2025|Fernando Januário|Projetos|Estagiário|2000|0|212|0|26.59|0|0|343.27|1762.59|166.67|0|0|0|0|4511.11
01/2025|Gabriel Abramo|Nuvem Gerenciada|Analista de Infra Júnior I|4901|660|212|552.76|27.62|392.08|1362.48|343.27|1762.59|530.94|408.42|75.15|261.14|14.95|11504.40
01/2025|Gabriel Schiszler Lourijola|Desenvolvimento|Desenvolvedor Pleno III|8260|660|212|1306.48|43.86|660.80|2296.28|343.27|1762.59|894.83|688.33|126.65|440.12|25.20|17720.42
01/2025|Guilherme Goldmann|Comercial|Analista de Geração de Demanda|2282|660|212|567.05|26.59|182.56|634.40|343.27|1762.59|247.22|190.17|34.99|121.59|6.96|7271.38
01/2025|Guilherme Ribeiro Santos|Desenvolvimento|Estagiário|2000|0|212|479.83|27.62|0|0|343.27|1762.59|166.67|0|0|0|0|4991.97
01/2025|Guilherme Santos|Nuvem Gerenciada|Analista de Infra Júnior I|4853|660|448|552.76|27.62|388.24|1349.13|343.27|1762.59|525.74|404.42|74.41|258.58|14.80|11662.57
01/2025|Gustavo Silva|Projetos|Analista de Infra Júnior I|4853|660|448|552.76|27.62|388.24|1349.13|343.27|1762.59|525.74|404.42|74.41|258.58|14.80|11662.57
01/2025|Jefferson Silva|Projetos|Tech Leader|9570|660|0|653.24|28.42|765.60|2660.46|343.27|1762.59|1036.75|797.50|146.74|509.92|29.19|18963.68
01/2025|Leonardo Barca|CoE|Analista Desenvolvedor Júnior I|4853|660|448|552.76|27.62|388.24|1349.13|343.27|1762.59|525.74|404.42|74.41|258.58|14.80|11662.57
01/2025|Leonardo Miranda|Nuvem Gerenciada|Tech Leader|5441.25|660|374|653.24|27.62|435.30|1512.67|343.27|1762.59|589.47|453.44|83.43|289.93|16.60|12642.80
01/2025|Lucas Ortiz|Nuvem Gerenciada|Estagiário|1250|0|212|552.76|26.59|0|0|343.27|1762.59|104.17|0|0|0|0|4251.37
01/2025|Lucas Torino|Nuvem Gerenciada|Analista de Suporte Junior II|5386|660|212|653.24|31.53|430.88|1497.31|343.27|1762.59|583.48|448.83|82.59|286.98|16.43|12395.13
01/2025|Lucca Bastos|CoE|CoE|9570|660|0|653.24|28.42|765.60|2660.46|343.27|1762.59|1036.75|797.50|146.74|509.92|29.19|18963.68
01/2025|Maria Clara Eloi da Silva|Desenvolvimento|Analista Programador Júnior I|3392|660|0|479.83|31.53|271.36|942.98|343.27|1762.59|367.47|282.67|52.01|180.74|10.35|8776.78
01/2025|Maria Eduarda Rodrigues|Projetos|Analista de Projetos|3401|660|208|552.76|28.42|272.08|945.48|343.27|1762.59|368.44|283.42|52.15|181.22|10.38|9069.20
01/2025|Matheus Angelo|Projetos|Estagiário|2000|0|344|0|26.59|0|0|343.27|1762.59|166.67|0|0|0|0|4643.11
01/2025|Matheus Carlos|Nuvem Gerenciada|Analista de Infra Júnior II|5088.30|660|448|552.76|27.62|407.06|1414.55|343.27|1762.59|551.23|424.03|78.02|271.12|15.52|12044.07
01/2025|Ravel Almeida Leite|Comercial|Consultor de Vendas Int Pleno I|3394|660|212|612.24|27.62|271.52|943.53|343.27|1762.59|367.68|282.83|52.04|180.84|10.35|9120.53
01/2025|Rodrigo Edaes Genaro|Nuvem Gerenciada|Estagiário|1250|0|212|552.76|26.59|0|0|343.27|1762.59|104.17|0|0|0|0|4251.37
01/2025|Saory Nayara Vieira Nakabori|Desenvolvimento|Analista Programador Júnior I|2642|660|210|479.83|27.62|211.36|734.48|343.27|1762.59|286.22|220.17|40.51|140.77|8.06|7766.87
01/2025|Vitor Santana|Nuvem Gerenciada|Estagiário|1250|0|328|0|26.59|0|0|343.27|1762.59|104.17|0|0|0|0|3814.61"""

# Processar apenas jan/2025 como amostra para verificar estrutura
# Depois adicionamos todos os meses

for line in raw.strip().split("\n"):
    parts = line.split("|")
    if len(parts) < 19:
        continue
    data_str = parts[0]
    nome = parts[1].strip()
    dep_nome = parts[2].strip()
    cargo = parts[3].strip()
    remuneracao = v(parts[4])
    refeicao = v(parts[5])
    transporte = v(parts[6])
    seg_saude = v(parts[7])
    seg_vida = v(parts[8])
    fgts = v(parts[9])
    gps = v(parts[10])
    equipamentos = v(parts[11])
    escritorio = v(parts[12])
    ferias = v(parts[13])
    dec_terceiro = v(parts[14])
    fgts2 = v(parts[15])
    gps2 = v(parts[16])
    multa_fgts = v(parts[17])
    total = v(parts[18])
    
    mes_str, ano_str = data_str.split("/")
    mes = int(mes_str)
    ano = int(ano_str)
    
    dep_id = deps.get(dep_nome)
    if not dep_id:
        print(f"  AVISO: departamento nao encontrado: {dep_nome}")
        continue
    
    # Tipo contrato
    tipo = "PJ" if cargo == "PJ" else "CLT"
    
    # Matricula: primeiras letras do nome
    matricula = "".join([p[0].upper() for p in nome.split()]) + str(mes).zfill(2) + str(ano)
    
    # Colaborador
    col = db.query(Colaborador).filter(Colaborador.nome == nome).first()
    if not col:
        col = Colaborador(
            nome=nome,
            matricula=matricula,
            departamento_id=dep_id,
            cargo=cargo if cargo != "PJ" else "Colaborador PJ",
            tipo_contrato=tipo,
            data_admissao=date(2020, 1, 1),
            ativo=True
        )
        db.add(col)
        db.flush()
    
    # Registro de custo
    reg = db.query(RegistroCusto).filter(
        RegistroCusto.colaborador_id == col.id,
        RegistroCusto.mes == mes,
        RegistroCusto.ano == ano
    ).first()
    
    if not reg:
        reg = RegistroCusto(colaborador_id=col.id, mes=mes, ano=ano)
        db.add(reg)
        db.flush()
        
        componentes = {
            "remuneracao": remuneracao,
            "refeicao": refeicao,
            "transporte": transporte,
            "seguro_saude": seg_saude,
            "seguro_vida": seg_vida,
            "fgts": fgts,
            "gps": gps,
            "equipamentos": equipamentos,
            "escritorio": escritorio,
            "ferias": ferias,
            "decimo_terceiro": dec_terceiro,
            "fgts_rescisao": fgts2,
            "gps_rescisao": gps2,
            "multa_fgts": multa_fgts,
        }
        for tipo_comp, valor in componentes.items():
            if valor > 0:
                db.add(ComponenteCusto(registro_custo_id=reg.id, tipo=tipo_comp, valor=Decimal(str(round(valor, 2)))))

db.commit()
cols_count = db.query(Colaborador).count()
custos_count = db.query(RegistroCusto).count()
print(f"Jan/2025 carregado. Colaboradores: {cols_count}, Registros: {custos_count}")
db.close()
