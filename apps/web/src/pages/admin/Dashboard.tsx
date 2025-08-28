import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Activity
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change }) => (
  <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            change.trend === 'up' ? 'text-green-500' : 'text-red-500'
          }`}>
            <TrendingUp className={`w-4 h-4 ${change.trend === 'down' ? 'transform rotate-180' : ''}`} />
            {change.value}%
          </div>
        )}
      </div>
      <div className="p-3 bg-coral/10 rounded-lg">
        <Icon className="w-6 h-6 text-coral" />
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboardStats()
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-900 h-32 rounded-lg border border-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const usersByRole = dashboardData?.usersByRole || {};
  const completionRates = dashboardData?.completionRates || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Administrativo</h1>
        <p className="text-slate-400 mt-1">Visão geral da plataforma Tatame</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2">
        <StatCard
          title="Total de Usuários"
          value={stats.totalUsers || 0}
          icon={Users}
        />
        <StatCard
          title="Cursos Ativos"
          value={stats.totalCourses || 0}
          icon={BookOpen}
        />
        <StatCard
          title="Total de Aulas"
          value={stats.totalLessons || 0}
          icon={GraduationCap}
        />
        <StatCard
          title="Usuários Ativos (30d)"
          value={stats.activeUsers || 0}
          icon={UserCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users by Role */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-coral" />
            Usuários por Função
          </h3>
          <div className="space-y-3">
            {Object.entries(usersByRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-coral rounded-full" />
                  <span className="text-slate-300 capitalize">
                    {role === 'aluno' ? 'Alunos' :
                     role === 'mentor' ? 'Mentores' :
                     role === 'moderador' ? 'Moderadores' :
                     role === 'admin' ? 'Administradores' : role}
                  </span>
                </div>
                <span className="text-white font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Course Completion Rates */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-coral" />
            Taxa de Conclusão por Curso
          </h3>
          <div className="space-y-4">
            {completionRates.length > 0 ? (
              completionRates.map((course: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm truncate">
                      {course.courseName || `Curso ${index + 1}`}
                    </span>
                    <span className="text-white text-sm font-medium">
                      {Math.round(course.completionRate || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-coral h-2 rounded-full transition-all"
                      style={{ width: `${course.completionRate || 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    {course.completedCount || 0} de {course.totalEnrollments || 0} concluídos
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum dado de conclusão disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Atividade Recente</h3>
        <div className="text-center py-8 text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Log de atividades será implementado em breve</p>
        </div>
      </div>
    </div>
  );
}