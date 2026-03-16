import json

try:
    data = b'{"a": 1}\x00'
    json.loads(data)
    print("SUCCESS")
except Exception as e:
    print("ERROR:", str(e))
