"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuditLogs } from '@/app/actions';
import { AuditLog } from '@/types/checkout';

interface AuditLogWithDetails extends AuditLog {
  user?: {
    name: string;
  };
  item?: {
    name: string;
    category: string;
  };
  checkout_task?: {
    event?: {
      name: string;
    };
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(
        startDate?.toISOString(),
        endDate?.toISOString()
      );
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const downloadAuditLogs = () => {
    // Convert audit logs to CSV
    const headers = ['Date', 'User', 'Action', 'Item', 'Event', 'Quantity Change', 'Reason']
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user?.name || 'Unknown',
      log.action,
      log.item?.name || 'Unknown',
      log.checkout_task?.event?.name || 'Unknown',
      log.quantity_change,
      log.reason || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <Button onClick={downloadAuditLogs}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={fetchLogs} disabled={loading}>
            {loading ? "Loading..." : "Apply Filters"}
          </Button>
        </div>

        <div className="border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Event</th>
                  <th className="text-left p-4">Item</th>
                  <th className="text-left p-4">Action</th>
                  <th className="text-left p-4">Quantity Change</th>
                  <th className="text-left p-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="p-4">
                      {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="p-4">{log.user?.name}</td>
                    <td className="p-4">{log.checkout_task?.event?.name}</td>
                    <td className="p-4">{log.item?.name}</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          log.action === "checkout"
                            ? "bg-blue-100 text-blue-800"
                            : log.action === "checkin"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "font-medium",
                          log.quantity_change > 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {log.quantity_change > 0
                          ? `+${log.quantity_change}`
                          : log.quantity_change}
                      </span>
                    </td>
                    <td className="p-4">{log.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 