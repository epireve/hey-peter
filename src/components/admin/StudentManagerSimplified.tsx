"use client";

import React, { useState, useMemo } from 'react';
import { Search, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Simplified student interface
interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone?: string;
  test_level?: string;
  status: 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn';
  progress_percentage: number;
  payment_status: 'Paid' | 'Pending' | 'Overdue' | 'Installment';
  profile_photo?: string;
}

// Simplified props
interface StudentManagerProps {
  students: Student[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  onAdd?: () => void;
}

// Simple search hook
const useStudentSearch = (students: Student[], searchTerm: string) => {
  return useMemo(() => {
    if (!searchTerm) return students;
    
    const term = searchTerm.toLowerCase();
    return students.filter(student => 
      student.full_name?.toLowerCase().includes(term) ||
      student.email?.toLowerCase().includes(term) ||
      student.student_id?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);
};

// Simple stats calculator
const useStudentStats = (students: Student[]) => {
  return useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'Active').length;
    const graduated = students.filter(s => s.status === 'Graduated').length;
    
    return { total, active, graduated };
  }, [students]);
};

// Status color helper
const getStatusColor = (status: string) => {
  const colors = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Graduated': 'bg-blue-100 text-blue-800',
    'Withdrawn': 'bg-red-100 text-red-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

// Payment status color helper
const getPaymentColor = (status: string) => {
  const colors = {
    'Paid': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Installment': 'bg-blue-100 text-blue-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

// Simple stats card component
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

// Simple action buttons component
const ActionButtons: React.FC<{ student: Student; onEdit?: (id: string) => void; onDelete?: (id: string) => void; onView?: (id: string) => void }> = ({
  student,
  onEdit,
  onDelete,
  onView
}) => (
  <div className="flex gap-2">
    {onView && (
      <Button variant="ghost" size="sm" onClick={() => onView(student.id)}>
        <Eye className="h-4 w-4" />
      </Button>
    )}
    {onEdit && (
      <Button variant="ghost" size="sm" onClick={() => onEdit(student.id)}>
        <Edit className="h-4 w-4" />
      </Button>
    )}
    {onDelete && (
      <Button variant="ghost" size="sm" onClick={() => onDelete(student.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    )}
  </div>
);

// Main simplified component
export const StudentManagerSimplified: React.FC<StudentManagerProps> = ({
  students,
  loading = false,
  onEdit,
  onDelete,
  onView,
  onAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredStudents = useStudentSearch(students, searchTerm);
  const stats = useStudentStats(students);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage your students efficiently</p>
        </div>
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total Students" value={stats.total} icon={<div className="h-4 w-4" />} />
        <StatsCard title="Active Students" value={stats.active} icon={<div className="h-4 w-4" />} />
        <StatsCard title="Graduated" value={stats.graduated} icon={<div className="h-4 w-4" />} />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.profile_photo} />
                        <AvatarFallback>
                          {student.full_name?.split(' ').map(n => n.charAt(0)).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{student.student_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.test_level || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(student.status)}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{student.progress_percentage}%</span>
                      </div>
                      <Progress value={student.progress_percentage} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentColor(student.payment_status)}>
                      {student.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionButtons
                      student={student}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={onView}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentManagerSimplified;
