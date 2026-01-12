import React, { useState, useEffect } from 'react';
import { UserRole, RDData, RDStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { RDForm } from './components/RDForm';
import { AdminPanel } from './components/AdminPanel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Login } from './components/Login';
import { SincronizadorDeDados } from './services/supabase/SincronizadorDeDados';
import { useAuth } from './context/AuthContext';
import { LogOut, Plus, Database, LayoutDashboard, BarChart3, Loader2, Wifi, WifiOff } from 'lucide-react';
import { supabase } from './lib/supabaseClient';


const App: React.FC = () => {
  const { user: currentUser, signOut, loading: authLoading } = useAuth();
  const [view, setView] = useState<'dashboard' | 'new' | 'admin' | 'analytics'>('dashboard');
  const [rds, setRds] = useState<RDData[]>([]);
  const [editingRD, setEditingRD] = useState<RDData | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (currentUser) {
      refreshRDs();

      // Check connection periodically
      const interval = setInterval(async () => {
        // Quick check
        const { error } = await supabase.from('rd_registros').select('count', { count: 'exact', head: true });
        setIsConnected(!error);
      }, 30000);

      // Subscribe to Realtime changes
      const subscription = SincronizadorDeDados.subscribeToChanges(() => {
        refreshRDs();
      });

      return () => {
        clearInterval(interval);
        subscription?.unsubscribe();
      };

    }
  }, [currentUser]);

  const refreshRDs = async () => {
    setLoading(true);
    const data = await SincronizadorDeDados.fetchFromSupabase();
    setRds(data);
    setLoading(false);
  };

  const handleLogout = () => {
    signOut();
    setEditingRD(undefined);
  };

  const handleSaveRD = async (data: RDData) => {
    try {
      setLoading(true);
      await SincronizadorDeDados.syncToSupabase(data);
      // Refresh is handled by subscription or manual refresh
      await refreshRDs();
      setEditingRD(undefined);
      setView('dashboard');
    } catch (error) {
      console.error("Erro ao salvar RD no App:", error);
      throw error; // Re-throw to let RDForm know it failed
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: RDStatus, note?: string) => {
    // Optimistic update
    const rdToUpdate = rds.find(rd => rd.id === id);
    if (!rdToUpdate) return;

    setRds(prev => prev.map(rd => rd.id === id ? { ...rd, status, supervisorNote: note } : rd));

    // Update locally then sync
    const updatedRD = { ...rdToUpdate, status, supervisorNote: note };
    await SincronizadorDeDados.syncToSupabase(updatedRD);
  };

  const handleDeleteRD = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir?")) {
      setLoading(true);
      await SincronizadorDeDados.deleteRD(id);
      await refreshRDs();
      setLoading(false);
    }
  };

  const handleEditRD = (rd: RDData) => {
    setEditingRD(rd);
    setView('new');
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-ciclus-600" /></div>;
  }

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-8 h-8 bg-ciclus-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">C</div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-none">Ciclus</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Digital RD</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <div title="Conectado ao Supabase" className="text-green-500"><Wifi className="w-4 h-4" /></div>
            ) : (
              <div title="Sem conexão" className="text-gray-400"><WifiOff className="w-4 h-4" /></div>
            )}

            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
              <p className="text-xs text-gray-400 uppercase">{currentUser.role}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors text-gray-400"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${view === 'dashboard' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>

          {/* Analytics Tab (CCO Only) */}
          {currentUser.role === UserRole.CCO && (
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${view === 'analytics' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <BarChart3 className="w-4 h-4" /> Indicadores
            </button>
          )}

          {/* Supervisor and CCO can access Management */}
          {(currentUser.role === UserRole.CCO || currentUser.role === UserRole.SUPERVISOR) && (
            <button
              onClick={() => setView('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${view === 'admin' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <Database className="w-4 h-4" /> Gestão
            </button>
          )}
        </div>

        {loading && view === 'dashboard' ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-ciclus-600 animate-spin" />
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
              <>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>
                    <p className="text-gray-500 text-sm">Acompanhamento diário de produção.</p>
                  </div>

                  {/* Supervisor and Encarregado can Create RDs */}
                  {(currentUser.role === UserRole.ENCARREGADO || currentUser.role === UserRole.SUPERVISOR) && (
                    <button
                      onClick={() => { setEditingRD(undefined); setView('new'); }}
                      className="bg-ciclus-600 hover:bg-ciclus-700 text-white px-4 py-3 rounded-lg shadow-lg shadow-ciclus-600/20 flex items-center gap-2 font-medium transition-all hover:scale-105 active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Novo RD</span>
                      <span className="sm:hidden">Criar</span>
                    </button>
                  )}
                </div>
                <Dashboard
                  rds={rds}
                  currentUser={currentUser}
                  onUpdateStatus={handleUpdateStatus}
                  onEditRD={handleEditRD}
                  onDeleteRD={handleDeleteRD}
                />
              </>
            )}

            {view === 'analytics' && currentUser.role === UserRole.CCO && (
              <AnalyticsDashboard rds={rds} />
            )}

            {view === 'new' && (
              <RDForm
                currentUser={currentUser}
                onSave={handleSaveRD}
                onCancel={() => { setEditingRD(undefined); setView('dashboard'); }}
                existingData={editingRD}
              />
            )}

            {view === 'admin' && <AdminPanel currentUser={currentUser} />}
          </>
        )}

      </main>
    </div>
  );
};

export default App;
