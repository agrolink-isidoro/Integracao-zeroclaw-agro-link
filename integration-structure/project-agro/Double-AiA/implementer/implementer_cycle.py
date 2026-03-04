"""
Script: implementer_cycle.py
Executa as tarefas recebidas do architect e aciona o reviewer ao final.
"""

def executar_tarefas(tarefas):
    print(f"Executando tarefas: {tarefas}")
    # Executa cada tarefa, atualiza status/logs
    # ...

def acionar_reviewer(resultados):
    print(f"Acionando reviewer para revisar: {resultados}")
    # Cria requests para reviewer
    # ...

# Exemplo de uso
if __name__ == "__main__":
    tarefas = ["build frontend", "deploy backend"]
    executar_tarefas(tarefas)
    acionar_reviewer("resultados das execuções")
