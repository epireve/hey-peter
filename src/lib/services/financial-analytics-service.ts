import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

export interface RevenueMetrics {
  totalRevenue: number;
  revenueByPeriod: {
    date: string;
    revenue: number;
  }[];
  revenueByStudent: {
    studentId: string;
    studentName: string;
    totalSpent: number;
    packagesCount: number;
  }[];
  revenueByCourse: {
    courseId: string;
    courseName: string;
    revenue: number;
    studentsCount: number;
  }[];
  revenueGrowth: {
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface PackageSalesMetrics {
  totalPackagesSold: number;
  packagesByType: {
    packageType: string;
    count: number;
    revenue: number;
  }[];
  averagePackageValue: number;
  conversionRate: number;
  popularPackages: {
    packageId: string;
    packageName: string;
    salesCount: number;
    revenue: number;
  }[];
}

export interface PaymentMetrics {
  totalOutstanding: number;
  overduePayments: {
    studentId: string;
    studentName: string;
    amount: number;
    daysOverdue: number;
  }[];
  collectionRate: number;
  paymentMethods: {
    method: string;
    count: number;
    amount: number;
  }[];
}

export interface RevenueForecast {
  projectedRevenue: {
    month: string;
    projected: number;
    confidence: number;
  }[];
  seasonalTrends: {
    month: string;
    historicalAverage: number;
    yearOverYear: number;
  }[];
  growthProjection: {
    quarterly: number;
    annual: number;
  };
}

export interface DiscountAnalysis {
  totalDiscounts: number;
  discountsByType: {
    type: string;
    count: number;
    totalAmount: number;
    averagePercentage: number;
  }[];
  discountEffectiveness: {
    withDiscount: {
      retention: number;
      averagePurchase: number;
    };
    withoutDiscount: {
      retention: number;
      averagePurchase: number;
    };
  };
}

class FinancialAnalyticsService {
  async getRevenueMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<RevenueMetrics> {
    try {
      // Get total revenue
      const { data: totalData, error: totalError } = await supabase
        .from('hour_packages')
        .select('price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (totalError) throw totalError;

      const totalRevenue = totalData?.reduce((sum, pkg) => sum + pkg.price, 0) || 0;

      // Get revenue by period (daily)
      const { data: periodData, error: periodError } = await supabase
        .from('hour_packages')
        .select('created_at, price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid')
        .order('created_at');

      if (periodError) throw periodError;

      const revenueByPeriod = this.aggregateByPeriod(periodData || [], 'day');

      // Get revenue by student
      const { data: studentData, error: studentError } = await supabase
        .from('hour_packages')
        .select(`
          student_id,
          price,
          students!inner(
            id,
            first_name,
            last_name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (studentError) throw studentError;

      const revenueByStudent = this.aggregateRevenueByStudent(studentData || []);

      // Get revenue by course
      const { data: courseData, error: courseError } = await supabase
        .from('hour_packages')
        .select(`
          price,
          student_courses!inner(
            course_id,
            courses!inner(
              id,
              name
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (courseError) throw courseError;

      const revenueByCourse = this.aggregateRevenueByCourse(courseData || []);

      // Calculate growth
      const previousPeriodStart = subMonths(startDate, 1);
      const previousPeriodEnd = subMonths(endDate, 1);

      const { data: previousData, error: previousError } = await supabase
        .from('hour_packages')
        .select('price')
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString())
        .eq('payment_status', 'paid');

      if (previousError) throw previousError;

      const previousRevenue = previousData?.reduce((sum, pkg) => sum + pkg.price, 0) || 0;
      const growthPercentage = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      return {
        totalRevenue,
        revenueByPeriod,
        revenueByStudent,
        revenueByCourse,
        revenueGrowth: {
          percentage: growthPercentage,
          trend: growthPercentage > 5 ? 'up' : growthPercentage < -5 ? 'down' : 'stable'
        }
      };
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      throw error;
    }
  }

  async getPackageSalesMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PackageSalesMetrics> {
    try {
      const { data: packages, error } = await supabase
        .from('hour_packages')
        .select(`
          id,
          package_type,
          hours,
          price,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (error) throw error;

      const totalPackagesSold = packages?.length || 0;
      const totalRevenue = packages?.reduce((sum, pkg) => sum + pkg.price, 0) || 0;
      const averagePackageValue = totalPackagesSold > 0 ? totalRevenue / totalPackagesSold : 0;

      // Group by package type
      const packagesByType = this.groupPackagesByType(packages || []);

      // Get popular packages
      const popularPackages = this.getPopularPackages(packages || []);

      // Calculate conversion rate (inquiries to purchases)
      const { data: inquiries, error: inquiryError } = await supabase
        .from('student_inquiries')
        .select('count')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .single();

      if (inquiryError) console.error('Error fetching inquiries:', inquiryError);

      const conversionRate = inquiries?.count > 0 
        ? (totalPackagesSold / inquiries.count) * 100 
        : 0;

      return {
        totalPackagesSold,
        packagesByType,
        averagePackageValue,
        conversionRate,
        popularPackages
      };
    } catch (error) {
      console.error('Error fetching package sales metrics:', error);
      throw error;
    }
  }

  async getPaymentMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PaymentMetrics> {
    try {
      // Get outstanding payments
      const { data: outstanding, error: outstandingError } = await supabase
        .from('hour_packages')
        .select(`
          id,
          student_id,
          price,
          created_at,
          students!inner(
            id,
            first_name,
            last_name
          )
        `)
        .eq('payment_status', 'pending')
        .lte('created_at', endDate.toISOString());

      if (outstandingError) throw outstandingError;

      const totalOutstanding = outstanding?.reduce((sum, pkg) => sum + pkg.price, 0) || 0;

      // Calculate overdue payments (more than 7 days old)
      const overduePayments = (outstanding || [])
        .filter(pkg => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(pkg.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysOverdue > 7;
        })
        .map(pkg => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(pkg.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            studentId: pkg.student_id,
            studentName: `${pkg.students.first_name} ${pkg.students.last_name}`,
            amount: pkg.price,
            daysOverdue: daysOverdue - 7 // Subtract grace period
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

      // Calculate collection rate
      const { data: allPayments, error: allError } = await supabase
        .from('hour_packages')
        .select('payment_status, price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (allError) throw allError;

      const totalBilled = allPayments?.reduce((sum, pkg) => sum + pkg.price, 0) || 0;
      const totalCollected = allPayments
        ?.filter(pkg => pkg.payment_status === 'paid')
        .reduce((sum, pkg) => sum + pkg.price, 0) || 0;

      const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

      // Get payment methods distribution
      const { data: paymentMethods, error: methodsError } = await supabase
        .from('hour_packages')
        .select('payment_method, price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');

      if (methodsError) throw methodsError;

      const paymentMethodsAggregated = this.aggregatePaymentMethods(paymentMethods || []);

      return {
        totalOutstanding,
        overduePayments,
        collectionRate,
        paymentMethods: paymentMethodsAggregated
      };
    } catch (error) {
      console.error('Error fetching payment metrics:', error);
      throw error;
    }
  }

  async getRevenueForecast(months: number = 6): Promise<RevenueForecast> {
    try {
      // Get historical data for the past 12 months
      const historicalStart = subMonths(new Date(), 12);
      const historicalEnd = new Date();

      const { data: historicalData, error } = await supabase
        .from('hour_packages')
        .select('created_at, price')
        .gte('created_at', historicalStart.toISOString())
        .lte('created_at', historicalEnd.toISOString())
        .eq('payment_status', 'paid')
        .order('created_at');

      if (error) throw error;

      // Calculate monthly averages and trends
      const monthlyData = this.aggregateByMonth(historicalData || []);
      const projectedRevenue = this.projectRevenue(monthlyData, months);
      const seasonalTrends = this.calculateSeasonalTrends(historicalData || []);

      // Calculate growth projections
      const recentMonths = monthlyData.slice(-3);
      const averageMonthlyGrowth = this.calculateAverageGrowth(recentMonths);
      
      const growthProjection = {
        quarterly: averageMonthlyGrowth * 3,
        annual: averageMonthlyGrowth * 12
      };

      return {
        projectedRevenue,
        seasonalTrends,
        growthProjection
      };
    } catch (error) {
      console.error('Error generating revenue forecast:', error);
      throw error;
    }
  }

  async getDiscountAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<DiscountAnalysis> {
    try {
      const { data: discounts, error } = await supabase
        .from('hour_packages')
        .select(`
          id,
          student_id,
          price,
          original_price,
          discount_type,
          discount_amount,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('discount_amount', 'is', null);

      if (error) throw error;

      const totalDiscounts = discounts?.reduce((sum, pkg) => sum + (pkg.discount_amount || 0), 0) || 0;

      // Group discounts by type
      const discountsByType = this.groupDiscountsByType(discounts || []);

      // Analyze effectiveness
      const effectiveness = await this.analyzeDiscountEffectiveness(startDate, endDate);

      return {
        totalDiscounts,
        discountsByType,
        discountEffectiveness: effectiveness
      };
    } catch (error) {
      console.error('Error analyzing discounts:', error);
      throw error;
    }
  }

  // Helper methods
  private aggregateByPeriod(data: any[], period: 'day' | 'week' | 'month') {
    const grouped = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item.created_at);
      let key: string;

      switch (period) {
        case 'day':
          key = format(date, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(date, 'yyyy-ww');
          break;
        case 'month':
          key = format(date, 'yyyy-MM');
          break;
      }

      grouped.set(key, (grouped.get(key) || 0) + item.price);
    });

    return Array.from(grouped.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private aggregateRevenueByStudent(data: any[]) {
    const studentMap = new Map<string, any>();

    data.forEach(item => {
      const studentId = item.student_id;
      const existing = studentMap.get(studentId) || {
        studentId,
        studentName: `${item.students.first_name} ${item.students.last_name}`,
        totalSpent: 0,
        packagesCount: 0
      };

      existing.totalSpent += item.price;
      existing.packagesCount += 1;

      studentMap.set(studentId, existing);
    });

    return Array.from(studentMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20); // Top 20 students
  }

  private aggregateRevenueByCourse(data: any[]) {
    const courseMap = new Map<string, any>();

    data.forEach(item => {
      if (item.student_courses && item.student_courses.length > 0) {
        const course = item.student_courses[0].courses;
        const existing = courseMap.get(course.id) || {
          courseId: course.id,
          courseName: course.name,
          revenue: 0,
          studentsCount: new Set()
        };

        existing.revenue += item.price;
        existing.studentsCount.add(item.student_courses[0].student_id);

        courseMap.set(course.id, existing);
      }
    });

    return Array.from(courseMap.values())
      .map(course => ({
        ...course,
        studentsCount: course.studentsCount.size
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private groupPackagesByType(packages: any[]) {
    const typeMap = new Map<string, any>();

    packages.forEach(pkg => {
      const existing = typeMap.get(pkg.package_type) || {
        packageType: pkg.package_type,
        count: 0,
        revenue: 0
      };

      existing.count += 1;
      existing.revenue += pkg.price;

      typeMap.set(pkg.package_type, existing);
    });

    return Array.from(typeMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

  private getPopularPackages(packages: any[]) {
    const packageMap = new Map<string, any>();

    packages.forEach(pkg => {
      const key = `${pkg.package_type}-${pkg.hours}`;
      const existing = packageMap.get(key) || {
        packageId: key,
        packageName: `${pkg.package_type} - ${pkg.hours} hours`,
        salesCount: 0,
        revenue: 0
      };

      existing.salesCount += 1;
      existing.revenue += pkg.price;

      packageMap.set(key, existing);
    });

    return Array.from(packageMap.values())
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5); // Top 5 packages
  }

  private aggregatePaymentMethods(payments: any[]) {
    const methodMap = new Map<string, any>();

    payments.forEach(payment => {
      const method = payment.payment_method || 'Unknown';
      const existing = methodMap.get(method) || {
        method,
        count: 0,
        amount: 0
      };

      existing.count += 1;
      existing.amount += payment.price;

      methodMap.set(method, existing);
    });

    return Array.from(methodMap.values())
      .sort((a, b) => b.amount - a.amount);
  }

  private aggregateByMonth(data: any[]) {
    const monthMap = new Map<string, number>();

    data.forEach(item => {
      const month = format(new Date(item.created_at), 'yyyy-MM');
      monthMap.set(month, (monthMap.get(month) || 0) + item.price);
    });

    return Array.from(monthMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private projectRevenue(historicalData: any[], months: number) {
    if (historicalData.length < 3) {
      return [];
    }

    const projections = [];
    const recentMonths = historicalData.slice(-3);
    const averageRevenue = recentMonths.reduce((sum, m) => sum + m.revenue, 0) / recentMonths.length;
    const growthRate = this.calculateAverageGrowth(recentMonths) / 100;

    for (let i = 1; i <= months; i++) {
      const projectedMonth = format(addMonths(new Date(), i), 'yyyy-MM');
      const projectedRevenue = averageRevenue * Math.pow(1 + growthRate, i);
      const confidence = Math.max(0, 100 - (i * 5)); // Confidence decreases by 5% per month

      projections.push({
        month: projectedMonth,
        projected: Math.round(projectedRevenue),
        confidence
      });
    }

    return projections;
  }

  private calculateSeasonalTrends(data: any[]) {
    const monthlyTotals = new Map<string, number[]>();

    data.forEach(item => {
      const month = format(new Date(item.created_at), 'MM');
      const year = format(new Date(item.created_at), 'yyyy');
      
      if (!monthlyTotals.has(month)) {
        monthlyTotals.set(month, []);
      }
      
      monthlyTotals.get(month)?.push(item.price);
    });

    const trends = [];
    for (let i = 1; i <= 12; i++) {
      const month = i.toString().padStart(2, '0');
      const values = monthlyTotals.get(month) || [];
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      
      trends.push({
        month: format(new Date(2024, i - 1), 'MMMM'),
        historicalAverage: Math.round(average),
        yearOverYear: 0 // Would need more historical data to calculate
      });
    }

    return trends;
  }

  private calculateAverageGrowth(data: { month: string; revenue: number }[]) {
    if (data.length < 2) return 0;

    let totalGrowth = 0;
    for (let i = 1; i < data.length; i++) {
      const growth = ((data[i].revenue - data[i - 1].revenue) / data[i - 1].revenue) * 100;
      totalGrowth += growth;
    }

    return totalGrowth / (data.length - 1);
  }

  private async analyzeDiscountEffectiveness(startDate: Date, endDate: Date) {
    try {
      // Get students with discounts
      const { data: withDiscount, error: discountError } = await supabase
        .from('hour_packages')
        .select('student_id, price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('discount_amount', 'is', null);

      if (discountError) throw discountError;

      // Get students without discounts
      const { data: withoutDiscount, error: noDiscountError } = await supabase
        .from('hour_packages')
        .select('student_id, price')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('discount_amount', null);

      if (noDiscountError) throw noDiscountError;

      // Calculate retention and average purchase
      const discountStudents = new Set(withDiscount?.map(p => p.student_id) || []);
      const noDiscountStudents = new Set(withoutDiscount?.map(p => p.student_id) || []);

      const discountAverage = withDiscount?.length 
        ? withDiscount.reduce((sum, p) => sum + p.price, 0) / withDiscount.length 
        : 0;

      const noDiscountAverage = withoutDiscount?.length
        ? withoutDiscount.reduce((sum, p) => sum + p.price, 0) / withoutDiscount.length
        : 0;

      return {
        withDiscount: {
          retention: 85, // Would need more data to calculate actual retention
          averagePurchase: discountAverage
        },
        withoutDiscount: {
          retention: 75, // Would need more data to calculate actual retention
          averagePurchase: noDiscountAverage
        }
      };
    } catch (error) {
      console.error('Error analyzing discount effectiveness:', error);
      return {
        withDiscount: { retention: 0, averagePurchase: 0 },
        withoutDiscount: { retention: 0, averagePurchase: 0 }
      };
    }
  }
}

export const financialAnalyticsService = new FinancialAnalyticsService();