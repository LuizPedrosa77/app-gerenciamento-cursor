#!/usr/bin/env python3
"""
Script para testar conexão com conta GoatFunded
"""
import requests
import sys
import os

# Adicionar o backend ao path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.mtconnect import fetch_trade_history

def test_goat_connection():
    """Testa conexão com a conta GoatFunded"""
    
    # Dados da conta Goat
    login = "314634315"
    investor_password = "cr0IJ@LgBv"
    server = "GoatFunded-Server"
    platform = "MT5"
    
    print(f"🔍 Testando conexão com GoatFunded...")
    print(f"Login: {login}")
    print(f"Server: {server}")
    print(f"Platform: {platform}")
    print(f"Password: {'*' * len(investor_password)}")
    print("-" * 50)
    
    try:
        # Buscar histórico de trades
        deals = fetch_trade_history(
            login=login,
            investor_password=investor_password,
            server=server,
            platform=platform
        )
        
        print(f"✅ Conexão bem-sucedida!")
        print(f"📊 Encontrados {len(deals)} trades/deals")
        
        if deals:
            print("\n📈 Exemplos de trades:")
            for i, deal in enumerate(deals[:5]):  # Mostrar primeiros 5
                print(f"  {i+1}. {deal.get('symbol', 'N/A')} - {deal.get('type', 'N/A')} - Profit: {deal.get('profit', 0)}")
        
        return True
        
    except ValueError as e:
        print(f"❌ Erro na API: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

if __name__ == "__main__":
    success = test_goat_connection()
    sys.exit(0 if success else 1)
