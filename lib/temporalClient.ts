import { Connection, Client } from '@temporalio/client';

let client: Client | null = null;

export async function getTemporalClient() {
  if (!client) {
    const connection = await Connection.connect();
    client = new Client({ connection });
  }
  return client;
} 
