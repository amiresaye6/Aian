"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPendingSites, selectJiraSite } from '@/api/integrations';

interface Site {
  cloudId: string;
  name: string;
  url: string;
  avatarUrl: string;
}

export default function SelectJiraSitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionId = searchParams.get('connectionId');

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionId) {
      setError('Connection ID is missing in URL parameters.');
      setLoading(false);
      return;
    }

    const fetchSites = async () => {
      try {
        const data = await getPendingSites(connectionId);
        if (data.sites && data.sites.length > 0) {
          setSites(data.sites);
        } else {
          setError('No available Jira sites found. The connection may have already been established or timed out.');
        }
      } catch (err) {
        console.error('Failed to fetch pending sites:', err);
        setError('Failed to load Jira sites. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [connectionId]);

  const handleSelectSite = async (cloudId: string) => {
    if (!connectionId) return;

    setSelectingId(cloudId);
    setError(null);

    try {
      await selectJiraSite(connectionId, cloudId);
      // Premium Loading Delay for visual effect
      setTimeout(() => {
        router.push(`/eyes/jira/success?connectionId=${connectionId}`);
      }, 1000);
    } catch (err) {
      console.error('Failed to select Jira site:', err);
      setError('Failed to connect to the selected Jira site.');
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-slate-400">Loading your Jira workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0a0f1c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1c] to-black px-4 text-white">
      
      {/* Premium Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
          Choose your Jira Site
        </h1>
        <p className="mx-auto max-w-xl text-base font-medium text-slate-400 sm:text-lg">
          Your Atlassian account has access to multiple workspaces. Select the one you want to integrate with AIAN.
        </p>
      </div>

      {error ? (
        <div className="mb-8 w-full max-w-lg rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-lg backdrop-blur-md">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/eyes/jira/connect')}
            className="mt-4 rounded-lg bg-white/5 px-6 py-2 text-sm font-semibold transition-all hover:bg-white/10"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.cloudId}
              className={`group relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-yellow-500/50 hover:bg-white/[0.05] hover:shadow-[0_8px_40px_rgba(234,179,8,0.15)] ${
                selectingId === site.cloudId ? 'scale-95 border-yellow-500 bg-white/10 opacity-80' : ''
              } ${selectingId && selectingId !== site.cloudId ? 'opacity-50 grayscale' : ''}`}
            >
              <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(600px circle at 50% 0%, rgba(234, 179, 8, 0.1), transparent 40%)' }}></div>
              
              <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 shadow-inner group-hover:border-yellow-500/30">
                <img
                  src={site.avatarUrl}
                  alt={site.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              
              <div className="mb-8 text-center">
                <h3 className="mb-2 text-xl font-bold tracking-tight text-white group-hover:text-yellow-400 transition-colors">{site.name}</h3>
                <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]" title={site.url}>{site.url.replace(/^https?:\/\//, '')}</p>
              </div>

              <button
                disabled={selectingId !== null}
                onClick={() => handleSelectSite(site.cloudId)}
                className={`relative w-full overflow-hidden rounded-xl bg-white/5 py-3 text-sm font-semibold tracking-wide text-white transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-yellow-500 group-hover:to-amber-600 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-70`}
              >
                {selectingId === site.cloudId ? (
                  <span className="flex items-center justify-center">
                    <svg className="mr-2 h-4 w-4 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Select Workspace'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
