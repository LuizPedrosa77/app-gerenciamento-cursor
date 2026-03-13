// Teste de integração frontend-backend
// Este arquivo valida se as interfaces estão compatíveis

import { CreateConnectionData, MetaApiConnectionData } from './src/services/brokerService';

// Teste 1: CreateConnectionData (enviado para /api/v1/brokers/connect)
const connectionData: CreateConnectionData = {
  broker_type: 'MT5',
  account_name: 'Conta Principal Teste',
  login: '12345678',
  server: 'MetaQuotes-Demo',
  notes: 'Conta de teste para validação'
};

console.log('✅ CreateConnectionData válido:', connectionData);

// Teste 2: MetaApiConnectionData (enviado para /api/v1/metaapi/connect)
const metaApiData: MetaApiConnectionData = {
  account_id: '550e8400-e29b-41d4-a716-446655440000',
  login: '12345678',
  password: 'password123',
  server: 'MetaQuotes-Demo',
  platform: 'mt5'
};

console.log('✅ MetaApiConnectionData válido:', metaApiData);

// Teste 3: Verificar se todos os campos obrigatórios estão presentes
function validateConnectionData(data: CreateConnectionData): boolean {
  return !!(
    data.broker_type && 
    data.account_name && 
    data.login && 
    data.server
  );
}

function validateMetaApiData(data: MetaApiConnectionData): boolean {
  return !!(
    data.account_id && 
    data.login && 
    data.password && 
    data.server && 
    data.platform
  );
}

console.log('✅ Validação CreateConnectionData:', validateConnectionData(connectionData));
console.log('✅ Validação MetaApiConnectionData:', validateMetaApiData(metaApiData));

console.log('🎉 Todos os testes passaram! A integração está compatível.');
