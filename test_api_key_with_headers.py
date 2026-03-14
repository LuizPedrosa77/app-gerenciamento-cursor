#!/usr/bin/env python3
"""
Script para testar API key com headers adequados
"""
import requests

def test_api_key_with_headers():
    """Testa API key com headers de navegador"""
    
    api_key = "FfDghn2d9it8Mesmo2uVYh2YXdYgDAAm"
    
    print(f"🔑 Testando API Key com headers...")
    print(f"API Key: {api_key}")
    print("-" * 50)
    
    # Headers para simular navegador
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    # Testar com uma chamada simples
    url = "https://www.mtconnectapi.com/"
    params = {
        "a": "getTradeHistory",
        "apikey": api_key,
        "u": "",
        "an": "123456",  # Número de conta teste
        "t": "Demo-Server",
        "p": "password".encode("utf-8").hex(),
        "s": "",
        "l": 0,
        "pl": "MT5"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            if "FAIL Invalid api key" in response.text:
                print("❌ API Key inválida!")
                return False
            elif "FAIL Invalid account number" in response.text:
                print("✅ API Key válida! (mas conta de teste inválida)")
                return True
            else:
                print("✅ API Key funcionando!")
                return True
        else:
            print(f"❌ Erro HTTP: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

if __name__ == "__main__":
    test_api_key_with_headers()
