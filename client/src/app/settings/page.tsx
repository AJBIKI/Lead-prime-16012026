'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Key, Save, CheckCircle, AlertCircle, Settings as SettingsIcon } from "lucide-react";

// Enable credentials for all axios requests (sends cookies)
axios.defaults.withCredentials = true;

// API Base URL - uses environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        preferred_model: 'gemini',
        has_openai_key: false,
        has_gemini_key: false
    });

    // Form state
    const [openaiKey, setOpenaiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [preferredModel, setPreferredModel] = useState('gemini');
    const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        console.log('DEBUG: Fetching settings from:', `${API_BASE_URL}/api/settings`);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/settings`);
            setSettings(response.data.settings);
            setPreferredModel(response.data.settings.preferred_model);
            setOpenaiModel(response.data.settings.openai_model || 'gpt-4o-mini');
        } catch (err: any) {
            console.error('DEBUG: Failed to fetch settings:', err);
            console.error('DEBUG: Error Status:', err.response?.status);
            console.error('DEBUG: Error Data:', err.response?.data);

            // If 401/404, try to show it in UI
            if (err.response?.status === 404) {
                alert(`Error 404: Endpoint not found at ${API_BASE_URL}/api/settings`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payload: any = { preferred_model: preferredModel, openai_model: openaiModel };
        if (openaiKey) payload.openai_key = openaiKey;
        if (geminiKey) payload.gemini_key = geminiKey;

        try {
            const response = await axios.put(`${API_BASE_URL}/api/settings`, payload);
            setSettings(response.data.settings);
            setOpenaiKey(''); // Clear inputs on success
            setGeminiKey('');
            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Failed to update settings:', err);
            alert('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/">
                            <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            <SettingsIcon className="w-8 h-8 text-slate-700" />
                            Settings
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                            Configure your AI providers and application preferences.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Model Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Model Preference</CardTitle>
                            <CardDescription>Select which AI model to use for lead enrichment and email generation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex-1 p-4 border rounded-xl cursor-pointer transition-all ${preferredModel === 'gemini' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-200'}`}
                                    onClick={() => setPreferredModel('gemini')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800">Google Gemini</h3>
                                        {preferredModel === 'gemini' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                                    </div>
                                    <p className="text-sm text-slate-500">Fast, cost-effective, and great for general reasoning.</p>
                                </div>

                                <div
                                    className={`flex-1 p-4 border rounded-xl cursor-pointer transition-all ${preferredModel === 'openai' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-slate-200 hover:border-green-200'}`}
                                    onClick={() => setPreferredModel('openai')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800">OpenAI</h3>
                                        {preferredModel === 'openai' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">Industry standard. Bring your own key for GPT-4.</p>

                                    {/* Advanced Model Selector */}
                                    {preferredModel === 'openai' && (
                                        <div className="mt-2 text-left" onClick={(e) => e.stopPropagation()}>
                                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Model Version</label>
                                            <select
                                                className="w-full text-xs p-2 rounded-lg border border-green-200 text-slate-700 bg-white focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-slate-100"
                                                value={openaiModel}
                                                onChange={(e) => setOpenaiModel(e.target.value)}
                                                disabled={!settings.has_openai_key && !openaiKey}
                                            >
                                                <option value="gpt-4o-mini">gpt-4o-mini (Default / Cheap)</option>
                                                <option value="gpt-4o">gpt-4o (Smartest)</option>
                                                <option value="gpt-4-turbo">gpt-4-turbo</option>
                                                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                                            </select>
                                            {(!settings.has_openai_key && !openaiKey) && (
                                                <p className="text-[10px] text-orange-600 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Locked to Mini until API Key added below
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* API Keys */}
                    <Card>
                        <CardHeader>
                            <CardTitle>API Keys</CardTitle>
                            <CardDescription>Provide your own API keys to increase limits and control costs. Keys are encrypted at rest.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Gemini Key */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                                    <span>Google Gemini API Key</span>
                                    {settings.has_gemini_key ? (
                                        <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                                            <CheckCircle className="w-3 h-3" /> Key saved
                                        </span>
                                    ) : (
                                        <span className="text-xs text-yellow-600 flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                                            <AlertCircle className="w-3 h-3" /> No key set
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder={settings.has_gemini_key ? "••••••••••••••••" : "Enter Gemini API Key"}
                                        className="pl-9"
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>.
                                </p>
                            </div>

                            {/* OpenAI Key */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                                    <span>OpenAI API Key</span>
                                    {settings.has_openai_key ? (
                                        <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                                            <CheckCircle className="w-3 h-3" /> Key saved
                                        </span>
                                    ) : (
                                        <span className="text-xs text-yellow-600 flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                                            <AlertCircle className="w-3 h-3" /> No key set
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder={settings.has_openai_key ? "sk-••••••••••••••••" : "Enter OpenAI API Key"}
                                        className="pl-9"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" className="text-green-600 hover:underline">OpenAI Platform</a>.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 rounded-b-xl flex justify-end p-4">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Save Settings
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </div>
    );
}
