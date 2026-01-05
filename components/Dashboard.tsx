
import React, { useState, useMemo } from 'react';
import { RDData, RDStatus, UserRole, User } from '../types';
import { FileSpreadsheet, MapPin, XCircle, CheckCircle2, Filter, AlertTriangle, Eye, Calendar, FileText, Clock, Map as MapIcon, Calculator, Search, Trash2, Image as ImageIcon, MapPinned, User as UserIcon, Pencil, Route } from 'lucide-react';

interface DashboardProps {
  rds: RDData[];
  currentUser: User;
  onUpdateStatus: (id: string, status: RDStatus, note?: string) => void;
  onEditRD: (rd: RDData) => void;
  onDeleteRD: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ rds, currentUser, onUpdateStatus, onEditRD, onDeleteRD }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'month' | 'day'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState('');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRDs = useMemo(() => {
    return rds.filter(rd => {
      if (currentUser.role !== UserRole.CCO) {
        const isMyCreation = rd.foremanId === currentUser.id;
        const isAssignedToMe = rd.supervisorId === currentUser.id;

        if (currentUser.role === UserRole.SUPERVISOR) {
            if (!isMyCreation && !isAssignedToMe) return false;
        } else if (currentUser.role === UserRole.ENCARREGADO) {
            if (!isMyCreation) return false;
        }
      }

      if (filterStatus !== 'ALL' && rd.status !== filterStatus) return false;

      const rdDate = rd.date.split('T')[0];
      if (dateFilterType === 'month') {
        if (!rdDate.startsWith(selectedMonth)) return false;
      } else if (dateFilterType === 'day') {
        if (selectedDate && rdDate !== selectedDate) return false;
      }

      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matches = 
          rd.foremanName.toLowerCase().includes(lowerTerm) ||
          (rd.foremanRegistration || '').includes(lowerTerm) ||
          (rd.street || '').toLowerCase().includes(lowerTerm) ||
          (rd.neighborhood || '').toLowerCase().includes(lowerTerm);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rds, filterStatus, dateFilterType, selectedMonth, selectedDate, searchTerm, currentUser]);

  const periodTotals = useMemo(() => {
    return filteredRDs.reduce((acc, rd) => ({
      capina: acc.capina + (rd.metrics.capinaM || 0),
      rocagem: acc.rocagem + (rd.metrics.rocagemM2 || 0),
      pintura: acc.pintura + (rd.metrics.pinturaViasM || 0),
      postes: acc.postes + (rd.metrics.pinturaPostesUnd || 0),
      rdsCount: acc.rdsCount + 1
    }), { capina: 0, rocagem: 0, pintura: 0, postes: 0, rdsCount: 0 });
  }, [filteredRDs]);

  const handleRejectClick = (e: React.MouseEvent, rdId: string) => {
    e.stopPropagation();
    setRejectingId(rdId);
    setApprovingId(null);
    setDeletingId(null);
    setRejectionReason('');
  };

  const handleApproveClick = (e: React.MouseEvent, rdId: string) => {
    e.stopPropagation();
    setApprovingId(rdId);
    setRejectingId(null);
    setDeletingId(null);
  };
  
  const handleDeleteClick = (e: React.MouseEvent, rdId: string) => {
      e.stopPropagation();
      setDeletingId(rdId);
      setApprovingId(null);
      setRejectingId(null);
  };

  const handleEditClick = (e: React.MouseEvent, rd: RDData) => {
    e.stopPropagation();
    onEditRD(rd);
  };

  const handleSubmitRejection = (rdId: string) => {
    if (!rejectionReason.trim()) {
      alert("Por favor, informe o motivo da recusa.");
      return;
    }
    onUpdateStatus(rdId, RDStatus.REJECTED, rejectionReason);
    setRejectingId(null);
    setRejectionReason('');
  };

  const handleConfirmApproval = (rdId: string) => {
    onUpdateStatus(rdId, RDStatus.APPROVED);
    setApprovingId(null);
  };

  const handleConfirmDelete = (rdId: string) => {
      onDeleteRD(rdId);
      setDeletingId(null);
  };

  const handleCancelAction = () => {
    setRejectingId(null);
    setApprovingId(null);
    setDeletingId(null);
    setRejectionReason('');
  };

  const handleExportCSV = () => {
    if (filteredRDs.length === 0) {
      alert("Nenhum dado para exportar com os filtros atuais.");
      return;
    }

    const headers = [
      "ID", "Data", "Hora", "Supervisor", "Encarregado", "Base", "Turno", "Status", 
      "Rua", "Bairro", "Perímetro",
      "Capinação (m)", "Pintura (m)", "Roçagem (m²)", "Postes (und)", 
      "Homens (qtd)", "Observações", "Latitude", "Longitude",
      "Cap/Rasp m/homem", "Pintura Via m/homem", "Pintura de Poste nº/homem", "Roçagem (m²) / homem"
    ];

    const dataRows = filteredRDs.map(rd => {
        const dateObj = new Date(rd.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const presentCount = rd.teamAttendance.filter(a => a.present).length;
        const divisor = presentCount || 1;
        
        const capPerMan = (rd.metrics.capinaM / divisor).toFixed(2);
        const pintPerMan = (rd.metrics.pinturaViasM / divisor).toFixed(2);
        const postPerMan = (rd.metrics.pinturaPostesUnd / divisor).toFixed(2);
        const rocPerMan = (rd.metrics.rocagemM2 / divisor).toFixed(2);

        return [
          rd.id, dateStr, timeStr, rd.supervisorName || '', rd.foremanName, rd.base || '', rd.shift || '', rd.status,
          rd.street, rd.neighborhood, (rd.perimeter || '').replace(/;/g, ',').replace(/\n/g, ' '),
          rd.metrics.capinaM, rd.metrics.pinturaViasM, rd.metrics.rocagemM2, rd.metrics.pinturaPostesUnd,
          presentCount, (rd.observations || '').replace(/;/g, ',').replace(/\n/g, ' '),
          rd.location?.lat || '', rd.location?.lng || '',
          capPerMan, pintPerMan, postPerMan, rocPerMan
        ].join(";");
    });

    const csvContent = [headers.join(";"), ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ciclus_RD_Export_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Buscar por Encarregado, Rua, Bairro..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-ciclus-500 outline-none" />
            </div>
            <div className="flex gap-2">
                <div className="flex border border-gray-200 rounded-md overflow-hidden">
                    <button onClick={() => setDateFilterType('month')} className={`px-3 py-2 text-xs font-medium ${dateFilterType === 'month' ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-500'}`}>Mês</button>
                    <button onClick={() => setDateFilterType('day')} className={`px-3 py-2 text-xs font-medium ${dateFilterType === 'day' ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-500'}`}>Dia</button>
                </div>
                {dateFilterType === 'month' ? (
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-ciclus-500" />
                ) : (
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-ciclus-500" />
                )}
            </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-3">
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {['ALL', RDStatus.PENDING, RDStatus.APPROVED, RDStatus.REJECTED].map(st => (
                <button key={st} onClick={() => setFilterStatus(st)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === st ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {st === 'ALL' ? 'Todos' : st}
                </button>
                ))}
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                {currentUser.role !== UserRole.ENCARREGADO && (
                    <button onClick={handleExportCSV} className="flex-1 md:flex-none items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex">
                    <FileSpreadsheet className="w-4 h-4" /> Excel (Relatório)
                    </button>
                )}
            </div>
        </div>
      </div>

      {currentUser.role !== UserRole.ENCARREGADO && (
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 text-white shadow-lg animate-in fade-in slide-in-from-top-2">
           <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Calculator className="w-4 h-4" /> Total do Período</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-700">
               <div className="pl-2"><p className="text-2xl font-bold">{periodTotals.capina.toLocaleString('pt-BR')}<span className="text-sm font-normal text-gray-400">m</span></p><p className="text-[10px] text-gray-400 uppercase">Capinação</p></div>
               <div className="pl-4"><p className="text-2xl font-bold">{periodTotals.rocagem.toLocaleString('pt-BR')}<span className="text-sm font-normal text-gray-400">m²</span></p><p className="text-[10px] text-gray-400 uppercase">Roçagem</p></div>
               <div className="pl-4"><p className="text-2xl font-bold">{periodTotals.pintura.toLocaleString('pt-BR')}<span className="text-sm font-normal text-gray-400">m</span></p><p className="text-[10px] text-gray-400 uppercase">Pintura</p></div>
               <div className="pl-4"><p className="text-2xl font-bold">{periodTotals.rdsCount}</p><p className="text-[10px] text-gray-400 uppercase">RDs</p></div>
           </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredRDs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300"><p className="text-gray-400">Nenhum RD encontrado.</p></div>
        ) : (
          filteredRDs.map(rd => {
            const isPending = rd.status === RDStatus.PENDING;
            const isSupervisor = currentUser.role === UserRole.SUPERVISOR;
            const isCCO = currentUser.role === UserRole.CCO;
            const isAssignedToMe = rd.supervisorId === currentUser.id;
            const isMyCreation = rd.foremanId === currentUser.id;
            const canManage = isCCO || (isSupervisor && isAssignedToMe);
            const canEdit = isCCO || (isSupervisor && (isAssignedToMe || isMyCreation));

            return (
            <div key={rd.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start cursor-pointer" onClick={() => setExpandedId(expandedId === rd.id ? null : rd.id)}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${rd.status === RDStatus.APPROVED ? 'bg-green-100 text-green-800' : rd.status === RDStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{rd.status}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(rd.date).toLocaleDateString('pt-BR')}</span>
                    {isSupervisor && isAssignedToMe && !isMyCreation && (
                         <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><UserIcon className="w-2 h-2" /> Atribuído</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm md:text-base">{rd.street}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {rd.neighborhood}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <Eye className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === rd.id ? 'rotate-180' : ''}`} />
                  {rd.base && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{rd.base}</span>}
                </div>
              </div>

              <div className="px-4 py-2 bg-gray-50 flex gap-4 text-xs text-gray-600 border-b border-gray-100 overflow-x-auto">
                {rd.metrics.capinaM > 0 && <span><strong>Cap:</strong> {rd.metrics.capinaM}m</span>}
                {rd.metrics.rocagemM2 > 0 && <span><strong>Roç:</strong> {rd.metrics.rocagemM2}m²</span>}
                {rd.metrics.pinturaViasM > 0 && <span><strong>Pint:</strong> {rd.metrics.pinturaViasM}m</span>}
              </div>

              {expandedId === rd.id && (
                <div className="bg-white p-4 animate-in slide-in-from-top-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex gap-4 mb-2">
                           {rd.base && <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"><MapIcon className="w-3 h-3 text-gray-400" /> Base: <strong>{rd.base}</strong></div>}
                           {rd.shift && <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"><Clock className="w-3 h-3 text-gray-400" /> Turno: <strong>{rd.shift}</strong></div>}
                        </div>
                        
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Informações Gerais</p>
                          <p className="text-sm text-gray-700 mt-1"><strong>Encarregado:</strong> {rd.foremanName}</p>
                          <p className="text-sm text-gray-700 mt-1"><strong>Supervisor:</strong> {rd.supervisorName || 'N/A'}</p>
                          <p className="text-sm text-gray-700"><strong>Local:</strong> {rd.street}, {rd.neighborhood}</p>
                          {rd.perimeter && <p className="text-sm text-gray-500 italic mt-1">{rd.perimeter}</p>}
                          {rd.location && (
                             <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                                <p><strong>GPS:</strong> {rd.location.lat.toFixed(6)}, {rd.location.lng.toFixed(6)}</p>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${rd.location.lat},${rd.location.lng}`} target="_blank" rel="noreferrer" className="text-blue-600 underline mt-1 block font-bold">Ver no Mapa</a>
                             </div>
                          )}
                        </div>

                        <div>
                           <p className="text-xs font-bold text-gray-400 uppercase mb-2">Presença ({rd.teamAttendance.filter(a=>a.present).length}/{rd.teamAttendance.length})</p>
                           <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                             {rd.teamAttendance.map(p => (
                               <li key={p.employeeId} className={`flex items-center gap-2 ${!p.present ? 'text-red-500' : 'text-gray-600'}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${p.present ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                 <span>{p.name} - {p.role}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                        {rd.observations && <div className="bg-yellow-50 p-3 rounded border border-yellow-100"><p className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> Observações</p><p className="text-sm text-gray-700 italic">{rd.observations}</p></div>}
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Comprovação Fotográfica</p>
                        <div className="grid grid-cols-3 gap-2">
                           {rd.workPhotoInitial && <div><p className="text-[8px] text-center mb-1 text-gray-400 font-bold uppercase">Inicial</p><img src={rd.workPhotoInitial} alt="Inicial" className="w-full h-24 object-cover border rounded shadow-sm" /></div>}
                           {rd.workPhotoProgress && <div><p className="text-[8px] text-center mb-1 text-gray-400 font-bold uppercase">Progresso</p><img src={rd.workPhotoProgress} alt="Progresso" className="w-full h-24 object-cover border rounded shadow-sm" /></div>}
                           {rd.workPhotoFinal && <div><p className="text-[8px] text-center mb-1 text-gray-400 font-bold uppercase">Final</p><img src={rd.workPhotoFinal} alt="Final" className="w-full h-24 object-cover border rounded shadow-sm" /></div>}
                        </div>
                      </div>
                   </div>

                   {rd.supervisorNote && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-red-800 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><div><strong>Nota da Recusa:</strong> {rd.supervisorNote}</div></div>
                   )}

                   <div className="mt-6 pt-4 border-t border-gray-100">
                      {rejectingId === rd.id ? (
                         <div className="p-4 bg-red-50 rounded border border-red-100">
                            <label className="block text-xs font-bold text-red-800 uppercase mb-2">Motivo da Recusa</label>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full p-3 border border-red-200 rounded text-sm mb-3 focus:ring-red-500 outline-none" placeholder="Motivo..." autoFocus rows={2} />
                            <div className="flex gap-2 justify-end"><button onClick={handleCancelAction} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm">Cancelar</button><button onClick={() => handleSubmitRejection(rd.id)} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold">Confirmar</button></div>
                         </div>
                      ) : approvingId === rd.id ? (
                        <div className="p-4 bg-green-50 rounded border border-green-100">
                            <p className="text-sm font-bold text-green-800 mb-3">Confirmar aprovação?</p>
                            <div className="flex gap-2 justify-end"><button onClick={handleCancelAction} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm">Cancelar</button><button onClick={() => handleConfirmApproval(rd.id)} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Sim, Aprovar</button></div>
                        </div>
                      ) : deletingId === rd.id ? (
                         <div className="p-4 bg-red-50 rounded border border-red-100">
                             <p className="text-sm font-bold text-red-800 mb-2">Excluir permanentemente?</p>
                             <div className="flex gap-2 justify-end"><button onClick={handleCancelAction} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm">Cancelar</button><button onClick={() => handleConfirmDelete(rd.id)} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold">Excluir</button></div>
                         </div>
                      ) : (
                        <div className="flex flex-col md:flex-row gap-2 justify-between">
                            <div className="flex gap-2 w-full">
                                {currentUser.id === rd.foremanId && rd.status === RDStatus.REJECTED && (<button onClick={() => onEditRD(rd)} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold">Corrigir</button>)}
                                {canManage && isPending && (
                                    <>
                                        <button onClick={(e) => handleApproveClick(e, rd.id)} className="flex-1 bg-green-600 text-white py-2 rounded font-medium text-sm">Aprovar</button>
                                        <button onClick={(e) => handleRejectClick(e, rd.id)} className="flex-1 bg-red-600 text-white py-2 rounded font-medium text-sm">Recusar</button>
                                    </>
                                )}
                                {canEdit && (
                                     <button onClick={(e) => handleEditClick(e, rd)} className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 py-2 rounded font-medium text-sm hover:bg-gray-200 transition-colors">
                                         <Pencil className="w-4 h-4 inline mr-1" /> Editar
                                     </button>
                                )}
                            </div>
                            {currentUser.role === UserRole.CCO && (
                                <button onClick={(e) => handleDeleteClick(e, rd.id)} className="bg-gray-100 text-red-600 px-3 py-2 rounded border border-gray-200 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            )}
                        </div>
                      )}
                   </div>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
