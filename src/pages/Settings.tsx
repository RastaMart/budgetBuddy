import React, { useState } from 'react';
import { useAuth } from '../hooks/useContext';
import { supabase } from '../lib/supabase';
import { TransactionRules } from '../components/settings/TransactionRules';

export function Settings() {
  const { user, profile } = useAuth();
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Get list of all timezones
  const timezones = Intl.supportedValuesOf('timeZone');

  async function handleTimezoneChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newTimezone = e.target.value;
    setTimezone(newTimezone);
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ timezone: newTimezone })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Timezone updated successfully' });
    } catch (error) {
      console.error('Error updating timezone:', error);
      setMessage({ type: 'error', text: 'Failed to update timezone' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="max-w-xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Timezone Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Your Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={handleTimezoneChange}
                disabled={saving}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <div 
                className={`rounded-md p-4 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <p className="text-sm text-gray-500">
              Your current local time is: {new Date().toLocaleString('en-US', { timeZone: timezone })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <TransactionRules />
      </div>
    </div>
  );
}