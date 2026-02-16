'use client';

import { useEffect, useState } from 'react';
import { AgentProfile, DiscoveryQuery } from '@uap/shared/src/types';

const REGISTRY_URL = 'http://localhost:4000';

export default function DirectoryPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [searchCapability, setSearchCapability] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadAgents();
    loadStats();

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadAgents();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch(`${REGISTRY_URL}/api/agents`);
      const data = await res.json();
      setAgents(data.agents || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load agents:', error);
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${REGISTRY_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const searchAgents = async () => {
    if (!searchCapability.trim()) {
      loadAgents();
      return;
    }

    try {
      const query: DiscoveryQuery = {
        capabilities: [searchCapability.trim()],
        availableNow: true,
      };

      const res = await fetch(`${REGISTRY_URL}/api/agents/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 10px 0' }}>🦞 UAP Agent Directory</h1>
        <p style={{ color: '#666', fontSize: '18px' }}>Discover and connect with personal AI agents</p>
      </header>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0369a1' }}>{stats.totalAgents}</div>
            <div style={{ color: '#666' }}>Total Agents</div>
          </div>
          <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#15803d' }}>{stats.onlineAgents}</div>
            <div style={{ color: '#666' }}>Online Now</div>
          </div>
          <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#b45309' }}>{stats.totalServices}</div>
            <div style={{ color: '#666' }}>Services</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search by capability (e.g., Calendar, Math, CodeReview)..."
            value={searchCapability}
            onChange={(e) => setSearchCapability(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchAgents()}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <button
            onClick={searchAgents}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🔍 Search
          </button>
          <button
            onClick={loadAgents}
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
          <div style={{ fontSize: '18px' }}>No agents registered yet</div>
          <div style={{ marginTop: '10px' }}>Start a UAP agent to register it here</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {agents.map(agent => (
            <div
              key={agent.agentId}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '24px',
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <div>
                {agent.icon ? (
                  <img src={agent.icon} alt={agent.name} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                  }}>
                    🤖
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>{agent.name}</h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: agent.status === 'online' ? '#d1fae5' : '#fee2e2',
                    color: agent.status === 'online' ? '#065f46' : '#991b1b',
                  }}>
                    {agent.status}
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: '#f3f4f6',
                    color: '#374151',
                  }}>
                    Load: {agent.load}%
                  </span>
                </div>

                {agent.owner && (
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    Owner: {agent.owner.name}
                  </div>
                )}

                {agent.description && (
                  <div style={{ color: '#666', marginBottom: '12px' }}>{agent.description}</div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {agent.capabilities.map(cap => (
                    <span
                      key={cap}
                      style={{
                        padding: '4px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '16px',
                        fontSize: '14px',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                  Last seen: {new Date(agent.lastSeen).toLocaleString()}
                </div>
              </div>

              <div>
                <button
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                  onClick={() => {
                    alert(`Connect to: ${agent.endpoint.protocol}://${agent.endpoint.host}:${agent.endpoint.port}`);
                  }}
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer style={{ marginTop: '60px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
        <p>UAP Agent Directory v0.1.0</p>
        <p>Agents refresh every 10 seconds • Mark offline after 60 seconds of inactivity</p>
      </footer>
    </div>
  );
}
