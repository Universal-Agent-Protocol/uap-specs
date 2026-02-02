'use client';

import { useState, useEffect } from 'react';
import { AgentProfile, CalendarEvent, CoordinationRequest } from '@uap/shared/src/types';

const REGISTRY_URL = 'http://localhost:4000';

export default function SchedulerPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDuration, setEventDuration] = useState('60');
  const [preferredTimes, setPreferredTimes] = useState('');
  const [coordinationStatus, setCoordinationStatus] = useState<'idle' | 'coordinating' | 'success' | 'error'>('idle');
  const [proposedSlots, setProposedSlots] = useState<string[]>([]);
  const [scheduledEvent, setScheduledEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const res = await fetch(`${REGISTRY_URL}/api/agents/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilities: ['Calendar'],
          availableNow: true,
        }),
      });

      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const coordinateMeeting = async () => {
    if (selectedAgents.length === 0 || !eventTitle.trim()) {
      alert('Please select agents and enter event title');
      return;
    }

    setCoordinationStatus('coordinating');

    try {
      // Step 1: Query availability from all selected agents
      console.log('Step 1: Querying availability from agents:', selectedAgents);

      // Simulate agent coordination (in reality, UAP would handle this)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Find common available slots
      const slots = generateProposedSlots();
      setProposedSlots(slots);

      console.log('Step 2: Proposed time slots:', slots);

      // Step 3: Select best slot (in reality, agents would negotiate)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const bestSlot = slots[0];

      // Step 4: Create event
      const event: CalendarEvent = {
        id: `event-${Date.now()}`,
        title: eventTitle,
        description: `Coordinated meeting via UAP`,
        start: bestSlot,
        end: new Date(new Date(bestSlot).getTime() + parseInt(eventDuration) * 60000).toISOString(),
        attendees: selectedAgents.map(agentId => ({
          agentId,
          status: 'accepted',
        })),
      };

      setScheduledEvent(event);
      setCoordinationStatus('success');

      console.log('Step 4: Event created:', event);
    } catch (error) {
      console.error('Coordination failed:', error);
      setCoordinationStatus('error');
    }
  };

  const generateProposedSlots = (): string[] => {
    const now = new Date();
    const slots: string[] = [];

    // Generate next 3 business days, 9am-5pm
    for (let day = 1; day <= 3; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(9, 0, 0, 0);

      for (let hour = 0; hour < 3; hour++) {
        const slot = new Date(date);
        slot.setHours(9 + hour * 3);
        slots.push(slot.toISOString());
      }
    }

    return slots;
  };

  const resetForm = () => {
    setEventTitle('');
    setSelectedAgents([]);
    setCoordinationStatus('idle');
    setProposedSlots([]);
    setScheduledEvent(null);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', margin: '0 0 10px 0' }}>📅 UAP Agent Scheduler</h1>
        <p style={{ color: '#666', fontSize: '16px' }}>Coordinate meetings between agents automatically</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Left Column: Setup */}
        <div>
          <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', marginTop: 0 }}>1. Event Details</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Event Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g., UAP Planning Meeting"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Duration (minutes)</label>
              <select
                value={eventDuration}
                onChange={(e) => setEventDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginTop: 0 }}>2. Select Participants</h2>

            {agents.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No agents with Calendar capability found
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {agents.map(agent => (
                  <div
                    key={agent.agentId}
                    onClick={() => toggleAgent(agent.agentId)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${selectedAgents.includes(agent.agentId) ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedAgents.includes(agent.agentId) ? '#eff6ff' : 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{agent.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{agent.owner?.name}</div>
                    </div>
                    {selectedAgents.includes(agent.agentId) && (
                      <div style={{ color: '#3b82f6', fontSize: '20px' }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={coordinateMeeting}
              disabled={coordinationStatus === 'coordinating' || selectedAgents.length === 0 || !eventTitle.trim()}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                background: coordinationStatus === 'coordinating' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: coordinationStatus === 'coordinating' ? 'not-allowed' : 'pointer',
              }}
            >
              {coordinationStatus === 'coordinating' ? '🔄 Coordinating...' : '🚀 Coordinate Meeting'}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div>
          {coordinationStatus === 'idle' && (
            <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <div style={{ color: '#666' }}>
                Select participants and coordinate a meeting
              </div>
            </div>
          )}

          {coordinationStatus === 'coordinating' && (
            <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
              <h3>🔄 Coordinating...</h3>
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  ✓ Querying {selectedAgents.length} agent{selectedAgents.length > 1 ? 's' : ''} for availability...
                </div>
                <div style={{ marginBottom: '12px' }}>
                  ⏳ Analyzing calendars...
                </div>
                <div style={{ marginBottom: '12px' }}>
                  🤝 Negotiating optimal time slot...
                </div>
              </div>
            </div>
          )}

          {coordinationStatus === 'success' && scheduledEvent && (
            <div style={{ background: 'white', border: '2px solid #10b981', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px' }}>✅</div>
                <div>
                  <h3 style={{ margin: 0, color: '#10b981' }}>Meeting Scheduled!</h3>
                  <div style={{ fontSize: '14px', color: '#666' }}>Coordinated in 3 seconds</div>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <h4 style={{ marginTop: 0, fontSize: '18px' }}>{scheduledEvent.title}</h4>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Time:</strong> {new Date(scheduledEvent.start).toLocaleString()}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Duration:</strong> {eventDuration} minutes
                </div>
                <div>
                  <strong>Participants:</strong> {scheduledEvent.attendees.length}
                </div>
              </div>

              {proposedSlots.length > 0 && (
                <details style={{ marginTop: '16px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '8px' }}>
                    View all proposed slots ({proposedSlots.length})
                  </summary>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {proposedSlots.slice(0, 5).map((slot, i) => (
                      <div key={i} style={{ padding: '4px 0' }}>
                        • {new Date(slot).toLocaleString()}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <button
                onClick={resetForm}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '10px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Schedule Another Meeting
              </button>
            </div>
          )}

          {coordinationStatus === 'error' && (
            <div style={{ background: 'white', border: '2px solid #ef4444', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
                ❌ Coordination Failed
              </div>
              <div style={{ color: '#666', marginBottom: '16px' }}>
                Unable to find a suitable time for all participants
              </div>
              <button
                onClick={() => setCoordinationStatus('idle')}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
        <h3>How It Works</h3>
        <ol style={{ marginLeft: '20px', color: '#666' }}>
          <li style={{ marginBottom: '8px' }}>Select participants with Calendar capability</li>
          <li style={{ marginBottom: '8px' }}>Agents query each other's availability via UAP</li>
          <li style={{ marginBottom: '8px' }}>Negotiate optimal time using UACO protocol</li>
          <li style={{ marginBottom: '8px' }}>Event created in all calendars simultaneously</li>
          <li style={{ marginBottom: '8px' }}>No group chat. No back-and-forth. Just coordination.</li>
        </ol>
      </div>
    </div>
  );
}
