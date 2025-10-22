/**
 * Analytics Dashboard component for viewing user action statistics.
 * This is a simple admin interface for viewing analytics data.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, MousePointer, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsStats {
  period_days: number;
  total_sessions: number;
  total_actions: number;
  total_generations: number;
  successful_generations: number;
  success_rate: number;
  action_breakdown: Array<{ action_type: string; count: number }>;
  daily_activity: Array<{ date: string; actions: number }>;
}

interface UserAction {
  id: string;
  action_type: string;
  action_category: string;
  element_id?: string;
  element_type?: string;
  timestamp: string;
  success: string;
  action_data?: Record<string, any>;
}

export const AnalyticsDashboard = () => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentActions, setRecentActions] = useState<UserAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/analytics/stats?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch analytics stats:', error);
      toast.error('Failed to load analytics data');
    }
  };

  const fetchRecentActions = async () => {
    try {
      const response = await fetch('/api/analytics/actions?limit=20');
      if (response.ok) {
        const data = await response.json();
        setRecentActions(data.actions);
      }
    } catch (error) {
      console.error('Failed to fetch recent actions:', error);
      toast.error('Failed to load recent actions');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRecentActions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [days]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'form_submit':
        return <MousePointer className="h-4 w-4" />;
      case 'download':
        return <Download className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'dsl_editor_click':
        return <span className="text-xs">📝</span>;
      default:
        return <MousePointer className="h-4 w-4" />;
    }
  };

  const getSuccessBadge = (success: string) => {
    return success === 'true' ? (
      <Badge variant="default" className="bg-green-500">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sessions}</div>
              <p className="text-xs text-muted-foreground">
                Over {stats.period_days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_actions}</div>
              <p className="text-xs text-muted-foreground">
                User interactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generations</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_generations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.successful_generations} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Generation success rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Action Breakdown</CardTitle>
            <CardDescription>Actions by type over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.action_breakdown.map((action) => (
              <div key={action.action_type} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">{action.action_type}</span>
                <Badge variant="secondary">{action.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Actions per day over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.daily_activity.map((day) => (
              <div key={day.date} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">{day.date}</span>
                <Badge variant="outline">{day.actions} actions</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Actions</CardTitle>
            <CardDescription>Latest user actions across all sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getActionIcon(action.action_type)}
                    <div>
                      <div className="font-medium">{action.action_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {action.element_type && `${action.element_type} • `}
                        {formatDate(action.timestamp)}
                        {action.action_data?.dsl_path && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {action.action_data.dsl_path}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSuccessBadge(action.success)}
                    <Badge variant="outline">{action.action_category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  );
};
