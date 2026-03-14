#!/usr/bin/env python3
"""
Script para testar se a API key do MTConnect está funcionando
"""
import requests

def test_api_key():
    """Testa se a API key é válida"""
    
    api_key = "FfDghn2d9it8Mesmo2uVYh2YXdYgDAAm"
    
    print(f"🔑 Testando API Key...")
    print(f"API Key: {api_key}")
    print("-" * 50)
    
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
        response = requests.get(url, params=params, timeout=10)
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
    test_api_key()
