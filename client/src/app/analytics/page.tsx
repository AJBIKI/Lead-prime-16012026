'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import {
    Activity,
    DollarSign,
    Users,
    Mail,
    ArrowLeft,
    TrendingUp,
    Zap
} from "lucide-react";

// Enable credentials for all axios requests (sends cookies)
axios.defaults.withCredentials = true;

// API Base URL - uses environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AnalyticsPage() {
    const [overview, setOverview] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [costs, setCosts] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [overviewRes, trendsRes, costsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/analytics/overview`),
                axios.get(`${API_BASE_URL}/api/analytics/trends`),
                axios.get(`${API_BASE_URL}/api/analytics/costs`)
            ]);

            setOverview(overviewRes.data);
            setTrends(trendsRes.data.trends);
            setCosts(costsRes.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
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
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/">
                            <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Analytics Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                            Track your outreach performance and costs.
                        </p>
                    </div>
                    <Button onClick={fetchData} variant="outline">
                        <Activity className="mr-2 h-4 w-4" /> Refresh Data
                    </Button>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview?.totalLeads || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Across {overview?.totalCampaigns || 0} campaigns
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview?.emailsSent || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {overview?.emailsGenerated || 0} generated
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${costs?.total || '0.00'}</div>
                            <p className="text-xs text-muted-foreground">
                                Based on API usage
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview?.conversionRate || 0}%</div>
                            <p className="text-xs text-muted-foreground">
                                Leads to Emails Sent
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Growth Chart */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Lead Growth (Last 7 Days)</CardTitle>
                            <CardDescription>Number of new leads added per day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="leads"
                                            stroke="#8884d8"
                                            strokeWidth={3}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cost Breakdown */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Cost Breakdown</CardTitle>
                            <CardDescription>Estimated costs by service usage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Lead Enrichment</p>
                                            <p className="text-sm text-slate-500">LLM Processing</p>
                                        </div>
                                    </div>
                                    <span className="font-bold">${costs?.breakdown?.enrichment || '0.00'}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Search API</p>
                                            <p className="text-sm text-slate-500">SerpAPI Usage</p>
                                        </div>
                                    </div>
                                    <span className="font-bold">${costs?.breakdown?.search || '0.00'}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Email Generation</p>
                                            <p className="text-sm text-slate-500">Drafting Content</p>
                                        </div>
                                    </div>
                                    <span className="font-bold">${costs?.breakdown?.emailGeneration || '0.00'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
