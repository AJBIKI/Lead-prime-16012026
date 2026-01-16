'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  CheckCircle,
  AlertCircle,
  Mail,
  Zap,
  Globe,
  Users,
  Cpu,
  Newspaper,
  Copy,
  Send,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  History,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Settings as SettingsIcon
} from "lucide-react";

// Enable credentials for all axios requests (sends cookies)
axios.defaults.withCredentials = true;

// API Base URL - uses environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const [icp, setIcp] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Phase 3: Auth & Campaigns
  const [user, setUser] = useState<{ id: string; email: string; name?: string; picture?: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Phase 2.5: Email generation
  const [emailModal, setEmailModal] = useState({ open: false, lead: null, email: null, loading: false });
  const [editableEmail, setEditableEmail] = useState({ subject: '', body: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState({ open: false, loading: false, recipientEmail: '' });

  // Gmail OAuth (Email Sending)
  const [gmailConnected, setGmailConnected] = useState<{ connected: boolean; email?: string; name?: string }>({ connected: false });

  // Main init effect
  useEffect(() => {
    checkAuthStatus();
    checkGmailStatus();

    // Check for OAuth callback params in URL
    const params = new URLSearchParams(window.location.search);

    // App Login Success
    if (params.get('login') === 'success') {
      checkAuthStatus();
      window.history.replaceState({}, '', '/');
    }

    // Gmail Connect (Email Sending) Success
    if (params.get('oauth_success')) {
      const email = params.get('email');
      setGmailConnected({ connected: true, email: email || undefined });
      window.history.replaceState({}, '', '/');
    } else if (params.get('oauth_error')) {
      alert('Gmail connection failed: ' + params.get('oauth_error'));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Fetch campaigns whenever auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/app-auth/status`);
      if (response.data.authenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/api/app-auth/google`;
  };



  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/app-auth/logout`);
      setUser(null);
      setIsAuthenticated(false);
      setCampaigns([]);
    } catch (err) {
      alert('Logout failed');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/campaigns`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      console.log('Failed to fetch campaigns');
    }
  };

  const loadCampaign = async (campaignId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/campaigns/${campaignId}/leads`);
      setLeads(response.data.leads || []);
      setReports(response.data.leads || []); // For backward compatibility with existing UI
      setIcp(response.data.campaign.icp);
      setShowHistory(false);
    } catch (err) {
      alert('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this campaign and all its leads?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/campaigns/${campaignId}`);
      setCampaigns(prev => prev.filter(c => c._id !== campaignId));
    } catch (err) {
      alert('Failed to delete campaign');
    }
  };

  const checkGmailStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/email-accounts`);
      if (response.data.connected && response.data.accounts.length > 0) {
        const account = response.data.accounts[0];
        setGmailConnected({ connected: true, email: account.email, name: account.name });
      } else {
        setGmailConnected({ connected: false });
      }
    } catch (err) {
      console.log('Email accounts status check failed');
    }
  };

  const connectGmail = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const disconnectGmail = async () => {
    if (!gmailConnected.email) return;
    try {
      await axios.post(`${API_BASE_URL}/api/auth/email-accounts/disconnect`, { email: gmailConnected.email });
      setGmailConnected({ connected: false });
    } catch (err) {
      alert('Failed to disconnect email account');
    }
  };

  const startCampaign = async () => {
    if (!icp) return;
    setLoading(true);
    setErrors([]);
    setLeads([]);
    setReports([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/agents/start-campaign`, {
        icp,
        campaignName: campaignName || icp.substring(0, 50)
      });
      const data = response.data;
      if (data.data) {
        setLeads(data.data.leads || []);
        setReports(data.data.reports || []);
        setErrors(data.data.errors || []);

        // Refresh campaign history
        if (isAuthenticated) fetchCampaigns();
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to start campaign']);
    } finally {
      setLoading(false);
    }
  };

  const generateEmail = async (report: any) => {
    const leadId = report.leadId || report._id;
    setCurrentLeadId(leadId);
    setEmailModal({ open: true, lead: report.deep_dive || report, email: null, loading: true });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/emails/generate`, {
        leadId: leadId,
        userContext: {
          sender_name: 'John Doe',
          company: 'AI Solutions Inc',
          solution: 'AI-powered lead generation',
          website: 'aisolutions.com'
        }
      });

      const generatedEmail = response.data.email;
      setEmailModal(prev => ({ ...prev, email: generatedEmail, loading: false }));
      setEditableEmail({ subject: generatedEmail.subject, body: generatedEmail.body });
      setIsEditing(false);
    } catch (err: any) {
      setEmailModal(prev => ({ ...prev, loading: false }));
      alert('Email generation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const copyEmail = () => {
    if (emailModal.email) {
      const emailText = `Subject: ${editableEmail.subject}\n\n${editableEmail.body}`;
      navigator.clipboard.writeText(emailText);
      alert('Email copied to clipboard!');
    }
  };

  const openSendModal = () => {
    setSendModal({ open: true, loading: false, recipientEmail: '' });
  };

  const sendEmail = async () => {
    if (!currentLeadId || !sendModal.recipientEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setSendModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await axios.post(`${API_BASE_URL}/api/emails/${currentLeadId}/send`, {
        recipientEmail: sendModal.recipientEmail,
        // Send the edited content, not the original from database
        editedSubject: editableEmail.subject,
        editedBody: editableEmail.body
      });

      if (response.data.success) {
        alert(`✅ Email sent successfully via ${response.data.provider}!`);
        setSendModal({ open: false, loading: false, recipientEmail: '' });
        setEmailModal(prev => ({ ...prev, open: false }));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      const hint = err.response?.data?.hint || '';
      alert(`❌ Failed to send email: ${errorMsg}\n${hint}`);
      setSendModal(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100">
      {/* Background Orbs for Premium Feel */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold leading-none tracking-wide uppercase">
              <Zap className="w-3 h-3 mr-1" /> Autonomous Mode Active
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 group">
              Revenue <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500">Engine</span>
              <span className="ml-2 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono align-middle text-slate-500">v1.2</span>
            </h1>
            <p className="text-slate-500 max-w-lg">Orchestrate autonomous sales agents to discover high-intent leads and generate hyper-personalized outreach dossiers.</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* History Toggle */}
            {isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className={`rounded-2xl px-4 py-3 h-auto font-medium border-2 transition-all ${showHistory
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}

            {/* App Login / User Profile */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-slate-100" />
                  ) : (
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                      {user?.name?.charAt(0) || user?.email?.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                      {user?.name || user?.email}
                    </span>
                    <button
                      onClick={logout}
                      className="text-[10px] text-slate-500 hover:text-red-500 transition-colors flex items-center"
                    >
                      <LogOut className="w-2.5 h-2.5 mr-1" /> Log out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={loginWithGoogle}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-5 py-3 h-auto font-bold shadow-md transform active:scale-95 transition-all"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            {/* Gmail Connection Status */}
            {gmailConnected.connected ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Mail className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 truncate max-w-[100px]">{gmailConnected.email}</span>
                </div>
                <button
                  onClick={disconnectGmail}
                  className="text-xs text-green-600 hover:text-red-500 transition-colors font-medium border-l border-green-200 pl-3 ml-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <Button
                onClick={connectGmail}
                className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-2xl px-4 py-3 h-auto font-medium shadow-sm"
              >
                <Mail className="w-4 h-4 mr-2 text-red-500" />
                Link Gmail
              </Button>
            )}

            {/* Analytics Link */}
            {isAuthenticated && (
              <Link href="/analytics">
                <Button variant="ghost" className="text-slate-600 hover:text-indigo-600 font-medium">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}

            {isAuthenticated && (
              <Link href="/settings">
                <Button variant="ghost" className="text-slate-600 hover:text-indigo-600 font-medium ml-1">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            )}

            {/* Stats */}
            <div className="flex bg-white border-2 border-slate-200 rounded-2xl p-3 shadow-sm items-center gap-4">
              <div className="text-center px-2 border-r border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Leads</p>
                <p className="text-xl font-black text-slate-800 leading-none">{leads.length}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Intel</p>
                <p className="text-xl font-black text-slate-800 leading-none">{reports.length}</p>
              </div>
            </div>
          </div>
        </header>

        {/* History Sidebar / Overlay */}
        {showHistory && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Search History
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>No previous searches found</p>
                  </div>
                ) : (
                  campaigns.map((camp) => (
                    <div
                      key={camp._id}
                      onClick={() => loadCampaign(camp._id)}
                      className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-xl cursor-pointer transition-all hover:shadow-md relative"
                    >
                      <h3 className="font-bold text-slate-800 text-sm mb-1 leading-tight group-hover:text-indigo-600 truncate pr-6">
                        {camp.name}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {camp.lead_count} leads
                        </span>
                        <span>{new Date(camp.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={(e) => deleteCampaign(camp._id, e)}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auth Notice if not logged in */}
        {!isAuthenticated && (
          <div className="mb-8 p-4 bg-indigo-600 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-200 animate-pulse">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold leading-tight">Enable Persistent History</h3>
                <p className="text-xs text-indigo-100">Sign in to save your searches and manage campaigns across sessions.</p>
              </div>
            </div>
            <Button
              onClick={loginWithGoogle}
              className="bg-white text-indigo-600 hover:bg-slate-50 font-bold px-6 h-auto py-2.5 rounded-xl shadow-sm whitespace-nowrap"
            >
              Sign In Now
            </Button>
          </div>
        )}

        {/* Campaign Input Section */}
        <section className="mb-12">
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/70 backdrop-blur-xl border border-white/20">
            <CardHeader className="pb-3 text-center md:text-left">
              <CardTitle className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                <Search className="w-5 h-5 text-indigo-500" />
                Configure New Campaign
              </CardTitle>
              <CardDescription>Describe your Ideal Customer Profile (ICP) for the autonomous agents to research.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3 transition-all">
                <div className="flex flex-col gap-3 flex-1">
                  <div className="relative group">
                    <Input
                      placeholder="e.g. Series A Biotech startups in Cambridge focusing on drug discovery"
                      value={icp}
                      onChange={(e) => setIcp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startCampaign()}
                      className="h-14 pl-12 pr-4 bg-slate-50/50 border-slate-200 group-focus-within:border-indigo-400 group-focus-within:ring-4 group-focus-within:ring-indigo-50 transition-all rounded-xl"
                    />
                    <Globe className="absolute left-4 top-4 h-6 w-6 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <div className="relative group">
                    <Input
                      placeholder="Enter a name for this search (optional)"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="h-10 pl-10 pr-4 bg-slate-50/30 border-slate-100 rounded-lg text-xs"
                    />
                    <LayoutDashboard className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-300" />
                  </div>
                </div>
                <Button
                  onClick={startCampaign}
                  disabled={loading || !icp}
                  className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 group"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Agents Scouring Web...</>
                  ) : (
                    <><Zap className="mr-2 h-5 w-5 fill-white" /> Launch Discovery Engine</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Left Column: Discovered Leads (Smaller) */}
          <section className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                Live Feed
                {leads.length > 0 && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse ml-1" />}
              </h2>
            </div>

            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
              {leads.map((lead, idx) => (
                <Card key={idx} className="group hover:border-indigo-200 hover:shadow-md transition-all duration-300 cursor-default border-slate-200 overflow-hidden bg-white/80">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.company_name}</h3>
                      <a href={lead.website} target="_blank" className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic mb-3">"{lead.context}"</p>
                    <div className="flex items-center justify-between mt-4 text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Discovery Tool: SerpAPI</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {leads.length === 0 && !loading && (
                <div className="py-12 text-center bg-white/40 border border-dashed border-slate-300 rounded-3xl">
                  <Globe className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No active discovery threads</p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Deep-Dive Dossiers (Larger/Primary) */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Synthesized Dossiers
              </h2>
              {reports.length > 0 && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{reports.length} Reports Ready</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {reports.map((report, idx) => {
                const dossier = report.deep_dive || report || {};
                const hasStructuredData = dossier.company_summary || dossier.value_proposition;

                return (
                  <Card key={idx} className="border-none shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-200 hover:ring-indigo-300">
                    <div className="relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-400 via-indigo-500 to-indigo-600 shadow-sm" />
                    </div>

                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl font-black text-slate-900 leading-none mb-1">{dossier.company_name || report.company_name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                            Verified Intelligence Report
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {/* Quick Stats/Badges */}
                          <div className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <Cpu className="w-3 h-3" /> {dossier.llm_provider || 'Manual'}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {hasStructuredData ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Summary & Value Prop Area */}
                            <div className="md:col-span-8 space-y-6">
                              <div className="relative">
                                <p className="text-slate-600 leading-relaxed text-sm pr-4">{dossier.company_summary}</p>
                              </div>

                              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-4 rounded-2xl border border-indigo-100/50 shadow-inner">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Core Value Proposition</span>
                                <p className="text-indigo-900 font-bold text-sm leading-snug tracking-tight italic">
                                  "{dossier.value_proposition}"
                                </p>
                              </div>
                            </div>

                            {/* Sidebar Area: Tech & Customers */}
                            <div className="md:col-span-4 space-y-6 md:pl-4 border-l border-slate-100">
                              <div>
                                <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                  <Users className="w-3 h-3 mr-1.5" /> Ideal Customers
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {(dossier.target_customers || []).map((customer: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold hover:border-indigo-300 cursor-default transition-colors">
                                      {customer}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                  <Cpu className="w-3 h-3 mr-1.5" /> Stack Signals
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {(dossier.technologies || []).map((tech: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 bg-indigo-50/50 text-indigo-700/80 rounded-lg text-[10px] font-black tracking-wider border border-indigo-100/50">
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pain Points Section - Full Width */}
                          <div className="border-t border-slate-50 pt-6">
                            <span className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                              <AlertCircle className="w-3 h-3 mr-1.5 text-red-400" /> Key Friction & Pain Points
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                              {(dossier.pain_points || []).map((point: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 group/item">
                                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400/40 group-hover/item:bg-red-400 transition-colors" />
                                  <span className="text-sm text-slate-600 line-clamp-2">{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-inner">
                          <div className="flex items-center gap-2 mb-3">
                            <Newspaper className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Raw Intel Extraction</span>
                          </div>
                          <pre className="text-emerald-400 font-mono text-[10px] leading-relaxed overflow-auto max-h-60 custom-scrollbar opacity-90">
                            {dossier.raw_content_preview || dossier.error || "Analyzing available signals..."}
                          </pre>
                        </div>
                      )}

                      {/* Action Bar (FIXED BUTTONS) */}
                      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
                        <Button
                          variant="outline"
                          className="flex-1 h-12 rounded-xl text-slate-600 font-bold text-sm border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" /> View Detailed Dossier
                        </Button>
                        <Button
                          onClick={() => generateEmail(report)}
                          className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
                        >
                          <Mail className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          Generate Personalized Email
                        </Button>
                      </div>

                      {/* Micro Metadata Footer */}
                      <div className="flex items-center justify-between pt-4 opacity-40 hover:opacity-100 transition-opacity">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          Campaign ID: {Math.random().toString(36).substring(7).toUpperCase()}
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          Cost: ${dossier.extraction_cost?.toFixed(5) || '0.000'}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {reports.length === 0 && !loading && (
                <div className="py-32 text-center rounded-[32px] border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
                  <div className="relative inline-block mb-6">
                    <Loader2 className="w-16 h-16 text-slate-100 animate-pulse" />
                    <Search className="w-8 h-8 text-slate-300 absolute inset-0 m-auto" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Discovery Ready</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">Launch the discovery engine above to populate this command center with synthesized dossiers.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Global Error Handle */}
        {errors.length > 0 && (
          <div className="fixed bottom-6 right-6 max-w-md animate-in slide-in-from-right duration-500 z-[100]">
            <div className="bg-red-600 text-white p-5 rounded-3xl shadow-2xl flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1 uppercase tracking-widest leading-none">Intelligence Failure</h4>
                <ul className="text-xs text-red-50 opacity-90 space-y-1">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
              <button onClick={() => setErrors([])} className="text-white/50 hover:text-white mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 
          MODAL: PREMIUM EMAIL PREVIEW
          Glassmorphism design with clean typography
      */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.2)] max-w-3xl w-full h-full max-h-[85vh] border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="p-6 md:p-10 flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-[20px] bg-gradient-to-tr from-emerald-400 to-indigo-600 p-0.5 shadow-lg shadow-emerald-100">
                    <div className="h-full w-full bg-white rounded-[19px] flex items-center justify-center">
                      <Mail className="w-6 h-6 text-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Outreach Intelligence</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personalized for:</span>
                      <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-2 rounded-full">{(emailModal.lead as any)?.company_name}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModal({ open: false, lead: null, email: null, loading: false })}
                  className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center border border-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
                {emailModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                    <div className="relative mb-6 scale-150">
                      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                      <Mail className="h-4 w-4 text-indigo-300 absolute inset-0 m-auto" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 tracking-tight">Personalizing Outreach...</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-xs">Template retrieved from Pinecone. personalizing with Gemini Flash v1.5.</p>
                  </div>
                ) : (emailModal.email as any) ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Subject Line Field */}
                    <div className="group/field">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" /> Optimized Subject Line
                        </label>
                        <span className="text-[9px] font-bold text-indigo-400">98% Clarity Score</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editableEmail.subject}
                          onChange={(e) => setEditableEmail(prev => ({ ...prev, subject: e.target.value }))}
                          className="w-full p-5 bg-white rounded-2xl border-2 border-indigo-300 font-bold text-slate-800 tracking-tight focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                        />
                      ) : (
                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 font-bold text-slate-800 tracking-tight group-focus-within/field:border-indigo-300 group-focus-within/field:bg-white transition-all shadow-inner">
                          {editableEmail.subject}
                        </div>
                      )}
                    </div>

                    {/* Body Field */}
                    <div className="group/field">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-indigo-500" /> Draft Content
                        </label>
                        <span className="text-[9px] font-bold text-slate-400">Inter tone • Personalized • Concise</span>
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editableEmail.body}
                          onChange={(e) => setEditableEmail(prev => ({ ...prev, body: e.target.value }))}
                          rows={12}
                          className="w-full p-8 bg-white rounded-[32px] border-2 border-indigo-300 text-slate-700 leading-relaxed text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
                        />
                      ) : (
                        <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 text-slate-700 leading-relaxed text-base whitespace-pre-wrap font-medium group-focus-within/field:border-indigo-300 group-focus-within/field:bg-white transition-all shadow-inner">
                          {editableEmail.body}
                        </div>
                      )}
                    </div>

                    {/* Stats & Insight */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
                      <StatCard label="Match" val={`${((emailModal.email as any).template_match_score * 100).toFixed(0)}%`} icon={<Users className="w-3 h-3" />} />
                      <StatCard label="Model" val={(emailModal.email as any).llm_provider} icon={<Cpu className="w-3 h-3" />} />
                      <StatCard label="Cost" val={`$${(emailModal.email as any).cost?.toFixed(5)}`} icon={<TrendingUp className="w-3 h-3" />} />
                      <StatCard label="Strategy" val={(emailModal.email as any).template_category || 'Pain Point'} icon={<Zap className="w-3 h-3" />} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                    <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Generation Failed</h3>
                    <p className="text-sm text-slate-400">We couldn't reach the agentic synthesizer. Please try again.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              {!emailModal.loading && (emailModal.email as any) && (
                <div className="space-y-4 pt-8 mt-4 border-t border-slate-50">
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                      className={`flex-1 h-16 rounded-3xl font-black text-base transition-all active:scale-[0.97] ${isEditing
                        ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                        : 'bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700'
                        }`}
                    >
                      {isEditing ? '✓ Done Editing' : '✏️ Edit Email'}
                    </Button>
                    <Button
                      onClick={copyEmail}
                      className="flex-1 h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-black text-base shadow-2xl transition-all active:scale-[0.97] group/copy"
                    >
                      <Copy className="w-5 h-5 mr-2 group-hover/copy:rotate-12 transition-transform" />
                      Copy to Clipboard
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={openSendModal}
                    className="w-full h-16 bg-white hover:bg-indigo-50 border-2 border-indigo-600 text-indigo-600 rounded-3xl font-black text-base transition-all active:scale-[0.97] group/send shadow-sm"
                  >
                    <Send className="w-5 h-5 mr-2 group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                    Send via Integration
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {sendModal.open && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">📧 Send Email</h3>
              <button
                onClick={() => setSendModal({ open: false, loading: false, recipientEmail: '' })}
                className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={sendModal.recipientEmail}
                  onChange={(e) => setSendModal(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="contact@company.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Email will be sent using platform defaults.
                  Configure your own SMTP or SendGrid in settings for production use.
                </p>
              </div>

              <Button
                onClick={sendEmail}
                disabled={sendModal.loading || !sendModal.recipientEmail}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendModal.loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Email Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Global Styles for Animations & Scrollbars */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

// Sub-components for better organization

function DropdownIcon() {
  return (
    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function StatCard({ label, val, icon }: { label: string, val: string, icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
        {icon} {label}
      </div>
      <div className="text-xs font-black text-slate-800 truncate">{val}</div>
    </div>
  )
}
