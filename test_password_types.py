#!/usr/bin/env python3
"""
Script para testar diferentes tipos de senha e formatos de conta
"""
import requests

def test_password_types():
    """Testa diferentes combinações de senha e formato de conta"""
    
    api_key = "FfDghn2d9it8Mesmo2uVYh2YXdYgDAAm"
    login_variations = [
        "314634315",
        "314634315",  # Sem formatação especial
        "0314634315",  # Com zero à frente
    ]
    
    password_variations = [
        "cr0IJ@LgBv",  # Original
        "cr0IJ@LgBv",  # Sem alterações
    ]
    
    server_variations = [
        "GoatFunded-Server",
        "GoatFunded-Demo",
        "Goatunded-Live",
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }
    
    print(f"🔍 Testando combinações de login/senha/servidor...")
    print("-" * 60)
    
    for login in login_variations:
        for password in password_variations:
            for server in server_variations:
                print(f"\n📡 Testando: Login={login}, Server={server}")
                
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
                        response_text = response.text.strip()
                        if "FAIL Invalid account number" in response_text:
                            print(f"  ❌ Conta inválida")
                        elif "FAIL Authentication failed" in response_text:
                            print(f"  ❌ Falha de autenticação (senha incorreta)")
                        elif "FAIL Invalid server" in response_text:
                            print(f"  ❌ Servidor inválido")
                        elif "FAIL Invalid api key" in response_text:
                            print(f"  ❌ API Key inválida")
                        elif "FAIL" in response_text:
                            print(f"  ❌ Erro: {response_text}")
                        else:
                            print(f"  ✅ SUCESSO! Resposta: {response_text[:100]}...")
                            return {
                                'login': login,
                                'password': password,
                                'server': server,
                                'response': response_text
                            }
                    else:
                        print(f"  ❌ Erro HTTP: {response.status_code}")
                        
                except Exception as e:
                    print(f"  ❌ Erro de conexão: {e}")
    
    print(f"\n❌ Nenhuma combinação funcionou")
    print(f"\n💡 Sugestões:")
    print(f"   1. Verifique se o número da conta está correto")
    print(f"   2. Confirme se está usando a INVESTOR PASSWORD (não a master)")
    print(f"   3. Verifique o nome exato do servidor no MT5")
    print(f"   4. A conta pode estar desativada ou migrada")
    
    return None

if __name__ == "__main__":
    result = test_password_types()
    if result:
        print(f"\n🎉 Combinação encontrada!")
        print(f"Login: {result['login']}")
        print(f"Server: {result['server']}")
