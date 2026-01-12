
import React, { useEffect, useState, useMemo } from 'react';
import { RDData, Shift, TEAMS, User, UserRole } from '../types';
import { UserService } from '../services/supabase/UserService';
import { BarChart3, TrendingUp, Users, Filter, Calendar, Target, Award, Search, Paintbrush, Shovel, Ruler, Calculator, UserCheck, Map as MapIcon, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
    rds: RDData[];
}

import { supabase } from '../lib/supabaseClient';

// New interface for Aggregated Data
interface DailyIndicator {
    date: string;
    supervisor_id: string;
    foreman_id: string;
    team: string;
    total_capina_m: number;
    total_rocagem_m2: number;
    total_pintura_m: number;
    total_postes_und: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ rds }) => {
    const [dateMode, setDateMode] = useState<'month' | 'day'>('month');
    const [selectedDateValue, setSelectedDateValue] = useState(new Date().toISOString().slice(0, 7));

    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');
    const [selectedForeman, setSelectedForeman] = useState<string>('ALL');
    const [selectedShift, setSelectedShift] = useState<string>('ALL');
    const [rankingTab, setRankingTab] = useState<'sups' | 'foremen'>('sups');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [indicators, setIndicators] = useState<DailyIndicator[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            const users = await UserService.getUsers();
            setAllUsers(users);
        };
        loadUsers();
    }, []);

    // Fetch Aggregated Indicators from Supabase
    useEffect(() => {
        const fetchIndicators = async () => {
            setLoadingData(true);
            try {
                let query = supabase.from('rd_indicadores_dia').select('*');

                // Apply Date Filter
                if (dateMode === 'day') {
                    query = query.eq('date', selectedDateValue);
                } else {
                    // Month filter: e.g. 2024-01-01 to 2024-01-31
                    const start = `${selectedDateValue}-01`;
                    // Simple end of month calc
                    const [y, m] = selectedDateValue.split('-').map(Number);
                    const lastDay = new Date(y, m, 0).getDate();
                    const end = `${selectedDateValue}-${lastDay}`;
                    query = query.gte('date', start).lte('date', end);
                }

                if (selectedSupervisor !== 'ALL') {
                    query = query.eq('supervisor_id', selectedSupervisor);
                }
                if (selectedForeman !== 'ALL') {
                    query = query.eq('foreman_id', selectedForeman);
                }
                // Shift is not in aggregated table yet (maybe add later?), for now ignored or handled if added

                const { data, error } = await query;
                if (error) throw error;

                setIndicators(data as DailyIndicator[]);
            } catch (e) {
                console.error("Error loading indicators", e);
            } finally {
                setLoadingData(false);
            }
        };

        fetchIndicators();
    }, [dateMode, selectedDateValue, selectedSupervisor, selectedForeman]);

    // Supervisors List from Users (not RDs anymore)
    const supervisorsList = useMemo(() => {
        return allUsers.filter(u => u.role === UserRole.SUPERVISOR);
    }, [allUsers]);

    // Foremen List
    const foremenList = useMemo(() => {
        return allUsers.filter(u => u.role === UserRole.ENCARREGADO);
    }, [allUsers]);


    const distinctDaysCount = new Set(indicators.map(i => i.date)).size;
    const avgDivisor = distinctDaysCount === 0 ? 1 : distinctDaysCount;

    // Sum Aggregates
    const totalCapina = indicators.reduce((acc, curr) => acc + (Number(curr.total_capina_m) || 0), 0);
    const totalPinturaVias = indicators.reduce((acc, curr) => acc + (Number(curr.total_pintura_m) || 0), 0);
    const totalPinturaPostes = indicators.reduce((acc, curr) => acc + (Number(curr.total_postes_und) || 0), 0);
    const totalRocagem = indicators.reduce((acc, curr) => acc + (Number(curr.total_rocagem_m2) || 0), 0);

    const avgCapina = Math.round(totalCapina / avgDivisor);
    const avgPintura = Math.round(totalPinturaVias / avgDivisor);
    const avgPostes = Math.round(totalPinturaPostes / avgDivisor);
    const avgRocagem = Math.round(totalRocagem / avgDivisor);

    const dailyStats = useMemo(() => {
        // ... (Logic adapted to indicators)
        const contextMonth = dateMode === 'month' ? selectedDateValue : selectedDateValue.substring(0, 7);
        const [year, month] = contextMonth.split('-').map(Number);
        const stats: Record<string, { capina: number, tCapina: number, rocagem: number, tRocagem: number }> = {};
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            stats[dayKey] = { capina: 0, tCapina: 0, rocagem: 0, tRocagem: 0 };
        }

        indicators.forEach(ind => {
            const dayKey = ind.date; // already YYYY-MM-DD
            if (stats[dayKey]) {
                if (ind.total_capina_m > 0) {
                    stats[dayKey].capina += Number(ind.total_capina_m);
                    stats[dayKey].tCapina += 1; // Assuming 1 entry per supervisor/team per day is a valid denominator? Or just sum?
                    // Avg logic might need refinement if multiple teams work same day. 
                    // Usually avg per day = Total / Days.
                    // The chart shows "Daily Average". Maybe it means "Total Production of Day".
                    // Let's assume the chart wants Total Production per Day.
                }
                if (ind.total_rocagem_m2 > 0) {
                    stats[dayKey].rocagem += Number(ind.total_rocagem_m2);
                    stats[dayKey].tRocagem += 1;
                }
            }
        });

        // Re-mapping for chart
        return Object.entries(stats).map(([date, data]) => ({
            date,
            day: date.split('-')[2],
            avgCapina: data.capina, // Total per day
            avgRocagem: data.rocagem, // Total per day
            tCapina: 1, // Dummy
            tRocagem: 1
        }));

    }, [indicators, selectedDateValue, dateMode]);

    const rankings = useMemo(() => {
        const supRank: Record<string, { name: string, cap: number, roc: number, pintV: number, pintP: number, team?: string }> = {};
        const foreRank: Record<string, { name: string, cap: number, roc: number, pintV: number, pintP: number }> = {};

        indicators.forEach(ind => {
            // Supervisor
            const sKey = ind.supervisor_id || 'unknown';
            if (!supRank[sKey]) {
                const u = allUsers.find(x => x.id === sKey);
                supRank[sKey] = { name: u?.name || 'S/ ID', cap: 0, roc: 0, pintV: 0, pintP: 0, team: u?.team };
            }
            supRank[sKey].cap += Number(ind.total_capina_m);
            supRank[sKey].roc += Number(ind.total_rocagem_m2);
            supRank[sKey].pintV += Number(ind.total_pintura_m);
            supRank[sKey].pintP += Number(ind.total_postes_und);

            // Foreman
            const fKey = ind.foreman_id || 'unknown';
            if (!foreRank[fKey]) {
                const u = allUsers.find(x => x.id === fKey);
                foreRank[fKey] = { name: u?.name || 'S/ ID', cap: 0, roc: 0, pintV: 0, pintP: 0 };
            }
            foreRank[fKey].cap += Number(ind.total_capina_m);
            foreRank[fKey].roc += Number(ind.total_rocagem_m2);
            foreRank[fKey].pintV += Number(ind.total_pintura_m);
            foreRank[fKey].pintP += Number(ind.total_postes_und);
        });

        const sortFn = (a: any, b: any) => b.cap - a.cap || b.roc - a.roc;
        return {
            supervisors: Object.entries(supRank).map(([id, val]) => ({ id, ...val })).sort(sortFn),
            foremen: Object.entries(foreRank).map(([id, val]) => ({ id, ...val })).sort(sortFn)
        };
    }, [indicators, allUsers]);

    const META_CAPINA = 1950;
    const META_ROCAGEM = 1000;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-ciclus-600" /> Indicadores de Produtividade
                </h2>
                <p className="text-xs text-gray-500">Gestão operacional de metas e desempenho (Custo Zero)</p>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Período</label>
                        <div className="flex bg-white rounded border border-gray-200 overflow-hidden text-[9px]">
                            <button onClick={() => setDateMode('month')} className={`px-2 py-0.5 font-bold ${dateMode === 'month' ? 'bg-ciclus-100 text-ciclus-700' : 'text-gray-400'}`}>Mês</button>
                            <button onClick={() => setDateMode('day')} className={`px-2 py-0.5 font-bold border-l ${dateMode === 'day' ? 'bg-ciclus-100 text-ciclus-700' : 'text-gray-400'}`}>Dia</button>
                        </div>
                    </div>
                    <input type={dateMode === 'month' ? 'month' : 'date'} value={selectedDateValue} onChange={e => setSelectedDateValue(e.target.value)} className="w-full text-sm p-1.5 border border-gray-200 rounded bg-white font-bold outline-none" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Supervisor</label>
                    <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"><option value="ALL">Todos os Supervisores</option>{supervisorsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Encarregado</label>
                    <select value={selectedForeman} onChange={e => setSelectedForeman(e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"><option value="ALL">Todos os Encarregados</option>{foremenList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Turno</label>
                    <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="w-full text-sm p-2 border border-gray-200 rounded-lg bg-gray-50 outline-none"><option value="ALL">Todos os Turnos</option><option value={Shift.DIURNO}>{Shift.DIURNO}</option><option value={Shift.NOTURNO}>{Shift.NOTURNO}</option></select>
                </div>
            </div>

            {indicators.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">Sem dados para o período selecionado.</div>
            ) : (
                <>
                    {/* Cards de Indicadores (KPIs) - Conforme Imagem do Usuário */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card Capinação */}
                        <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden ring-1 ring-green-50">
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-bl-xl font-bold">Meta: 1.950m</div>
                            <div className="flex items-center gap-2 mb-4 text-green-700">
                                <Shovel className="w-5 h-5" />
                                <p className="text-[11px] uppercase font-bold tracking-wider">Capinação</p>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 leading-none">{totalCapina.toLocaleString('pt-BR')}<span className="text-lg font-normal text-gray-400 ml-1">m</span></h3>
                            <p className="text-xs text-gray-400 mt-4">Média: <span className="font-semibold text-gray-600">{avgCapina.toLocaleString('pt-BR')}m / dia</span></p>
                        </div>

                        {/* Card Pintura Vias */}
                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm ring-1 ring-blue-50">
                            <div className="flex items-center gap-2 mb-4 text-blue-700">
                                <Paintbrush className="w-5 h-5" />
                                <p className="text-[11px] uppercase font-bold tracking-wider">Pintura Vias</p>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 leading-none">{totalPinturaVias.toLocaleString('pt-BR')}<span className="text-lg font-normal text-gray-400 ml-1">m</span></h3>
                            <p className="text-xs text-gray-400 mt-4">Média: <span className="font-semibold text-gray-600">{avgPintura.toLocaleString('pt-BR')}m / dia</span></p>
                        </div>

                        {/* Card Postes */}
                        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm ring-1 ring-purple-50">
                            <div className="flex items-center gap-2 mb-4 text-purple-700">
                                <Ruler className="w-5 h-5" />
                                <p className="text-[11px] uppercase font-bold tracking-wider">Postes</p>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 leading-none">{totalPinturaPostes.toLocaleString('pt-BR')}<span className="text-lg font-normal text-gray-400 ml-1">und</span></h3>
                            <p className="text-xs text-gray-400 mt-4">Média: <span className="font-semibold text-gray-600">{avgPostes} / dia</span></p>
                        </div>

                        {/* Card Roçagem */}
                        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden ring-1 ring-emerald-50">
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded-bl-xl font-bold">Meta: 1.000m²</div>
                            <div className="flex items-center gap-2 mb-4 text-emerald-700">
                                <TrendingUp className="w-5 h-5" />
                                <p className="text-[11px] uppercase font-bold tracking-wider">Roçagem</p>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 leading-none">{totalRocagem.toLocaleString('pt-BR')}<span className="text-lg font-normal text-gray-400 ml-1">m²</span></h3>
                            <p className="text-xs text-gray-400 mt-4">Média: <span className="font-semibold text-gray-600">{avgRocagem.toLocaleString('pt-BR')}m² / dia</span></p>
                        </div>
                    </div>

                    {/* Avaliação de Performance Linear (Novo) */}
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm mb-2">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg">
                            <Target className="w-6 h-6 text-ciclus-600" /> Performance da Equipe e Supervisor (Linear)
                        </h3>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Card Capinação */}
                            <PerformanceCard
                                title="Capinação"
                                metaPerDay={META_CAPINA}
                                unit="m"
                                totalRealized={totalCapina}
                                daysWorked={distinctDaysCount}
                                supervisorName={selectedSupervisor === 'ALL' ? 'Visão Geral' : allUsers.find(u => u.id === selectedSupervisor)?.name || '---'}
                                teamName={selectedSupervisor === 'ALL' ? 'Todos' : allUsers.find(u => u.id === selectedSupervisor)?.team || '---'}
                                color="green"
                            />

                            {/* Card Roçagem */}
                            <PerformanceCard
                                title="Roçagem"
                                metaPerDay={META_ROCAGEM}
                                unit="m²"
                                totalRealized={totalRocagem}
                                daysWorked={distinctDaysCount}
                                supervisorName={selectedSupervisor === 'ALL' ? 'Visão Geral' : allUsers.find(u => u.id === selectedSupervisor)?.name || '---'}
                                teamName={selectedSupervisor === 'ALL' ? 'Todos' : allUsers.find(u => u.id === selectedSupervisor)?.team || '---'}
                                color="emerald"
                            />
                        </div>
                    </div>

                    {/* Gráficos de Metas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-ciclus-600 text-white text-[9px] px-2 py-1 rounded-full font-bold shadow-sm">META: 1.950m</div>
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-sm"><Shovel className="w-4 h-4 text-ciclus-600" /> Capinação e Raspagem Diária (Meta Lineal)</h3>
                            <div className="h-40 flex items-end justify-between gap-1 pt-4 relative border-b border-gray-100">
                                <div className="absolute top-[35%] left-0 right-0 border-t border-dashed border-red-300 z-0 pointer-events-none opacity-50"></div>
                                {dailyStats.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                        {d.tCapina > 0 && (
                                            <div className={`w-full max-w-[14px] rounded-t-sm transition-all duration-500 ${d.avgCapina >= META_CAPINA ? 'bg-ciclus-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-gray-300'}`} style={{ height: `${Math.min((d.avgCapina / 3000) * 100, 100)}%` }}>
                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] p-1 rounded whitespace-nowrap z-50 pointer-events-none">{Math.round(d.avgCapina)}m</div>
                                            </div>
                                        )}
                                        <span className="text-[7px] text-gray-400 mt-1">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] px-2 py-1 rounded-full font-bold shadow-sm">META: 1.000m²</div>
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4 text-emerald-500" /> Roçagem Diária (Meta m²)</h3>
                            <div className="h-40 flex items-end justify-between gap-1 pt-4 relative border-b border-gray-100">
                                <div className="absolute top-[50%] left-0 right-0 border-t border-dashed border-red-300 z-0 pointer-events-none opacity-50"></div>
                                {dailyStats.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                        {d.tRocagem > 0 && (
                                            <div className={`w-full max-w-[14px] rounded-t-sm transition-all duration-500 ${d.avgRocagem >= META_ROCAGEM ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gray-300'}`} style={{ height: `${Math.min((d.avgRocagem / 2000) * 100, 100)}%` }}>
                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] p-1 rounded whitespace-nowrap z-50 pointer-events-none">{Math.round(d.avgRocagem)}m²</div>
                                            </div>
                                        )}
                                        <span className="text-[7px] text-gray-400 mt-1">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Rankings */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex border-b border-gray-100 bg-gray-50/50">
                            <button onClick={() => setRankingTab('sups')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${rankingTab === 'sups' ? 'bg-white text-ciclus-600 border-b-2 border-ciclus-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}><Users className="w-4 h-4" /> Ranking Supervisores</button>
                            <button onClick={() => setRankingTab('foremen')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${rankingTab === 'foremen' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}><UserCheck className="w-4 h-4" /> Ranking Encarregados</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                        <th className="px-4 py-3 font-bold uppercase w-12 text-center">Pos</th>
                                        <th className="px-4 py-3 font-bold uppercase">Profissional</th>
                                        <th className="px-4 py-3 font-bold uppercase text-center"><div className="flex flex-col items-center"><Shovel className="w-3 h-3 mb-1" /><span>Cap (m)</span></div></th>
                                        <th className="px-4 py-3 font-bold uppercase text-center"><div className="flex flex-col items-center"><TrendingUp className="w-3 h-3 mb-1" /><span>Roç (m²)</span></div></th>
                                        <th className="px-4 py-3 font-bold uppercase text-center"><div className="flex flex-col items-center"><Paintbrush className="w-3 h-3 mb-1" /><span>Pint (m)</span></div></th>
                                        <th className="px-4 py-3 font-bold uppercase text-center"><div className="flex flex-col items-center"><Ruler className="w-3 h-3 mb-1" /><span>Post (un)</span></div></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(rankingTab === 'sups' ? rankings.supervisors : rankings.foremen).map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-4 text-center font-bold text-gray-400">{idx + 1}º</td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1 uppercase font-medium"><MapIcon className="w-2.5 h-2.5" /> {(item as any).team || 'Operacional'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-mono text-ciclus-700 font-bold">{Math.round(item.cap).toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-center font-mono text-emerald-600 font-bold">{Math.round(item.roc).toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-center font-mono text-blue-600">{Math.round(item.pintV).toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-center font-mono text-purple-600">{item.pintP}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const PerformanceCard: React.FC<{
    title: string;
    metaPerDay: number;
    unit: string;
    totalRealized: number;
    daysWorked: number;
    supervisorName: string;
    teamName: string;
    color: 'green' | 'emerald';
}> = ({ title, metaPerDay, unit, totalRealized, daysWorked, supervisorName, teamName, color }) => {
    const metaAcumulada = daysWorked * metaPerDay;
    const balance = totalRealized - metaAcumulada;
    const isPositive = balance >= 0;

    // Format helpers
    const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
            {/* Badge do Titulo */}
            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl ${color === 'green' ? 'bg-green-500' : 'bg-emerald-500'}`}>
                Meta: {fmt(metaPerDay)}{unit}
            </div>

            {/* Coluna Esquerda: Dados */}
            <div className="flex-1 space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Supervisor / Equipe</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm">{supervisorName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${color === 'green' ? 'bg-green-100 text-green-700' : 'bg-emerald-100 text-emerald-700'}`}>{teamName}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Dias Trabalhados</span>
                    <span className="font-bold text-gray-800 text-sm">{daysWorked}</span>
                </div>

                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Meta Acumulada</span>
                    <div className="text-right">
                        <span className="block font-bold text-gray-800 text-sm">{fmt(metaAcumulada)} {unit}</span>
                        <span className="text-[9px] text-gray-400">({daysWorked}d x {fmt(metaPerDay)}{unit})</span>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-gray-500 font-bold uppercase">Realizado</span>
                    <span className={`text-xl font-bold ${color === 'green' ? 'text-green-600' : 'text-emerald-600'}`}>{fmt(totalRealized)} {unit}</span>
                </div>
            </div>

            {/* Coluna Direita: Balanço */}
            <div className="flex-1 flex flex-col justify-center bg-gray-50 rounded-lg border border-gray-100 p-4 text-center relative overflow-hidden">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Balanço</span>

                <div className={`text-3xl font-black mb-1 flex items-center justify-center gap-1 ${isPositive ? (color === 'green' ? 'text-green-500' : 'text-emerald-500') : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{fmt(balance)} <span className="text-sm font-medium text-gray-400">{unit}</span>
                </div>

                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-4 overflow-hidden">
                    {/* Simple progress visualizer: if positive, full bar, if negative, partial? OR just a simple indicator */}
                    <div className={`h-full ${isPositive ? (color === 'green' ? 'bg-green-400' : 'bg-emerald-400') : 'bg-red-400'}`} style={{ width: '100%' }}></div>
                </div>

                {isPositive ?
                    <p className="text-[10px] text-green-600 mt-2 font-bold flex items-center justify-center gap-1"><Target className="w-3 h-3" /> Meta Batida!</p> :
                    <p className="text-[10px] text-red-500 mt-2 font-bold flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Abaixo da Meta</p>
                }
            </div>
        </div>
    );
};
