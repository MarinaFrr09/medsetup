import { StatsCards } from '@/components/dashboard/StatsCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { MedicalCuriosityWidget } from '@/components/dashboard/MedicalCuriosityWidget';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getGreeting()}, Usuário! 👋</h1>
        <p className="text-muted-foreground mt-2">
          Aqui está o resumo dos seus estudos hoje.
        </p>
      </div>

      <StatsCards />

      {/* Pílula de Conhecimento & Curiosidade Médica Horária */}
      <MedicalCuriosityWidget />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold">Ações Rápidas</h2>
          <QuickActions />
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Atividade Recente</h2>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
