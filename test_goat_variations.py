#!/usr/bin/env python3
"""
Script para testar diferentes variações do servidor GoatFunded
"""
import requests

def test_goat_variations():
    """Testa diferentes variações do nome do servidor"""
    
    api_key = "FfDghn2d9it8Mesmo2uVYh2YXdYgDAAm"
    login = "314634315"
    password = "cr0IJ@LgBv"
    
    # Variações possíveis do nome do servidor
    server_variations = [
        "GoatFunded-Server",
        "GoatFunded-Server-Demo",
        "GoatFunded",
        "GoatFunded-Demo",
        "GoatFunded-Live",
        "GoatFundedReal",
        "GoatFunded-Demo-Server",
        "GoatFunded-Demo1",
        "GoatFunded-Server1"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    print(f"🔍 Testando variações do servidor GoatFunded...")
    print(f"Login: {login}")
    print(f"Password: {'*' * len(password)}")
    print("-" * 60)
    
    for server in server_variations:
        print(f"\n📡 Testando servidor: {server}")
        
        url = "https://www.mtconnectapi.com/"
        params = {
            "a": "getTradeHistory",
            "apikey": api_key,
            "u": "",
            "an": login,
            "t": server,
            "p": password.encode("utf-8").hex(),
            "s": "",
            "l": 0,
            "pl": "MT5"
        }
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                if "FAIL Invalid account number" in response.text:
                    print(f"  ❌ Conta inválida para este servidor")
                elif "FAIL Invalid api key" in response.text:
                    print(f"  ❌ API Key inválida")
                elif "FAIL Invalid server" in response.text:
                    print(f"  ❌ Servidor inválido")
                elif "FAIL Authentication failed" in response.text:
                    print(f"  ❌ Falha de autenticação (senha ou servidor)")
                elif "FAIL" in response.text:
                    print(f"  ❌ Erro: {response.text}")
                else:
                    print(f"  ✅ SUCESSO! Resposta: {response.text[:100]}...")
                    return server
            else:
                print(f"  ❌ Erro HTTP: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Erro de conexão: {e}")
    
    print(f"\n❌ Nenhuma variação funcionou")
    return None

if __name__ == "__main__":
    test_goat_variations()
