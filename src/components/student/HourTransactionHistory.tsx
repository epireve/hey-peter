'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Plus, 
  Minus, 
  RefreshCw,
  Award,
  Filter,
  Search,
  Calendar,
  Download
} from 'lucide-react';
import { hourTrackingService } from '@/lib/services';
import { HourTransactionWithDetails, HourTransactionFilters } from '@/types/hour-management';

interface HourTransactionHistoryProps {
  studentId: string;
  showFilters?: boolean;
  maxHeight?: string;
}

export function HourTransactionHistory({ 
  studentId, 
  showFilters = true,
  maxHeight = '600px'
}: HourTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<HourTransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<HourTransactionFilters>({
    student_id: studentId
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    loadTransactions();
  }, [studentId, currentPage, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await hourTrackingService.getHourTransactions(
        { ...filters, student_id: studentId },
        currentPage,
        pageSize
      );
      
      if (response.success && response.data) {
        setTransactions(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        setError(response.error || 'Failed to load transactions');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      logger.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof HourTransactionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ student_id: studentId });
    setCurrentPage(1);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'deduction':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'bonus':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'makeup':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants = {
      purchase: 'default' as const,
      deduction: 'destructive' as const,
      refund: 'secondary' as const,
      bonus: 'default' as const,
      makeup: 'outline' as const,
      adjustment: 'outline' as const
    };
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number, type: string) => {
    const sign = ['purchase', 'refund', 'bonus', 'makeup'].includes(type) ? '+' : '-';
    return `${sign}${Math.abs(amount).toFixed(1)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportTransactions = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Description', 'Class/Booking'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(transaction => [
        new Date(transaction.created_at).toLocaleDateString(),
        transaction.transaction_type,
        transaction.amount,
        transaction.balance_after,
        `"${transaction.description || ''}"`,
        `"${transaction.class?.class_name || transaction.booking?.id || ''}"`
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hour-transactions-${studentId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Hour Transaction History
          </span>
          <div className="flex items-center space-x-2">
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filter Panel */}
        {showFilters && showFilterPanel && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Transaction Type</label>
                  <Select
                    value={filters.transaction_type || ''}
                    onValueChange={(value) => handleFilterChange('transaction_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="deduction">Deduction</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="makeup">Makeup</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">From Date</label>
                  <Input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">To Date</label>
                  <Input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4 space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button size="sm" onClick={() => setCurrentPage(1)}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Table */}
        {!loading && !error && (
          <>
            <div style={{ maxHeight }} className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Related</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No transactions found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(transaction.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            {getTransactionBadge(transaction.transaction_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            ['purchase', 'refund', 'bonus', 'makeup'].includes(transaction.transaction_type)
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatAmount(transaction.amount, transaction.transaction_type)} hrs
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {transaction.balance_after.toFixed(1)} hrs
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm">{transaction.description}</p>
                            {transaction.reason && (
                              <p className="text-xs text-gray-500">{transaction.reason}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {transaction.class && (
                              <p className="text-blue-600">
                                {transaction.class.class_name}
                                <span className="text-gray-500 block text-xs">
                                  {transaction.class.courses?.course_type}
                                </span>
                              </p>
                            )}
                            {transaction.booking && (
                              <p className="text-purple-600">
                                Booking {transaction.booking.id.slice(0, 8)}
                                <span className="text-gray-500 block text-xs">
                                  {formatDate(transaction.booking.scheduled_at)}
                                </span>
                              </p>
                            )}
                            {transaction.teacher && (
                              <p className="text-gray-600 text-xs">
                                Teacher: {transaction.teacher.users?.full_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, total)} of {total} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default HourTransactionHistory;