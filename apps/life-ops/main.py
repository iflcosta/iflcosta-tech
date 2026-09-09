"""
IF Tech Life & Business Ops - Entrypoint
Inicializa o banco de dados e executa a interface de usuário CustomTkinter.
"""

import os
import sys

# Garante que a pasta do script esteja no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from ui_app import LifeOpsApp

def main():
    # Inicializa tabelas e sementes do SQLite se não existirem
    init_db()
    
    # Lança a aplicação gráfica
    app = LifeOpsApp()
    app.mainloop()

if __name__ == "__main__":
    main()
