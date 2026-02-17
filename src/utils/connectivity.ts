// Connectivity testing utility for GITAM Faculty Management System
import { projectId, publicAnonKey } from './supabase/info';

export async function testBackendConnection(): Promise<{
  isConnected: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('Testing backend connection...');
    console.log('Project ID:', projectId);
    console.log('Public Anon Key:', publicAnonKey?.substring(0, 20) + '...');

    const baseUrl = `https://${projectId}.supabase.co/functions/v1/server`;
    const healthUrl = `${baseUrl}/make-server-99108478/health`;
    
    console.log('Testing URL:', healthUrl);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('Health check response:', data);
      return {
        isConnected: true,
        details: data
      };
    } else {
      const errorText = await response.text();
      console.log('Health check failed:', errorText);
      return {
        isConnected: false,
        error: `HTTP ${response.status}: ${errorText}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { error }
    };
  }
}

export async function logConnectionDetails() {
  console.log('=== GITAM Backend Connection Test ===');
  const result = await testBackendConnection();
  
  if (result.isConnected) {
    console.log('✅ Backend is connected and healthy');
    console.log('Server details:', result.details);
  } else {
    console.log('❌ Backend connection failed');
    console.log('Error:', result.error);
    console.log('Details:', result.details);
    console.log('Falling back to demo mode...');
  }
  
  return result;
}