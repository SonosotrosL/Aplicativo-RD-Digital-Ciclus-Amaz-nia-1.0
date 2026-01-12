
import React, { useState, useEffect } from 'react';
import { Employee, User, UserRole, TEAMS } from '../types';
import { EmployeeService } from '../services/supabase/EmployeeService';
import { UserService } from '../services/supabase/UserService';
import { Plus, Trash2, Save, User as UserIcon, Briefcase, Shield, AlertTriangle, Check, X, Loader2, Pencil, XCircle } from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'users'>('employees');
  const [loading, setLoading] = useState(false);

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpReg, setNewEmpReg] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmployeeForemanId, setNewEmployeeForemanId] = useState(''); // New State
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [deletingEmpId, setDeletingEmpId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Users State (CCO Only)
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState('');
  const [newUserReg, setNewUserReg] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ENCARREGADO);
  const [newUserTeam, setNewUserTeam] = useState<string>('');
  const [isCustomTeam, setIsCustomTeam] = useState(false); // New State
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);



  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const emps = await EmployeeService.getEmployees();
    setEmployees(emps);
    const roles = await EmployeeService.getExistingRoles();
    setAvailableRoles(roles);
    const usrs = await UserService.getUsers();
    setUsers(usrs);
    setLoading(false);
  };

  // --- Employee Logic ---

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const employeeToSave: Employee = {
      id: editingEmployeeId || ``, // Service handles ID for new, uses existing for edit
      name: newEmpName,
      registration: newEmpReg,
      role: newEmpRole,
      supervisorId: currentUser.id, // Assuming current user is the supervisor
      foremanId: newEmployeeForemanId || undefined
    };
    const success = await EmployeeService.saveEmployee(employeeToSave);
    if (success) {
      await refreshData();
      setNewEmpName('');
      setNewEmpReg('');
      setNewEmpRole('');
      setNewEmployeeForemanId('');
      setEditingEmployeeId(null);
      setIsAddingEmp(false); // Close form after saving
    } else {
      alert("Erro ao salvar colaborador.");
    }
    setLoading(false);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setNewEmpName(emp.name);
    setNewEmpReg(emp.registration);
    setNewEmpRole(emp.role);
    setNewEmployeeForemanId(emp.foremanId || '');
    setIsAddingEmp(true); // Open form for editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setNewEmpName('');
    setNewEmpReg('');
    setNewEmpRole('');
    setNewEmployeeForemanId('');
    setIsAddingEmp(false);
  };

  const handleConfirmDeleteEmployee = async (id: string) => {
    setLoading(true);
    await EmployeeService.deleteEmployee(id);
    await refreshData();
    setDeletingEmpId(null);
    setLoading(false);
  };

  // --- User Logic ---

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserReg(user.registration);
    setNewUserPass(''); // Don't show password
    setNewUserRole(user.role);
    setNewUserTeam(user.team || '');

    // Check if team is custom
    if (user.team && !TEAMS.some(t => t.name === user.team)) {
      setIsCustomTeam(true);
    } else {
      setIsCustomTeam(false);
    }

    setIsAddingUser(true);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setIsAddingUser(false);
    setNewUserName('');
    setNewUserReg('');
    setNewUserPass('');
    setNewUserRole(UserRole.ENCARREGADO);
    setNewUserTeam('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const userToSave: User = {
      id: editingUserId || ``,
      name: newUserName,
      registration: newUserReg,
      password: newUserPass,
      role: newUserRole,
      team: newUserTeam || undefined
    };
    try {
      await UserService.saveUser(userToSave);
      await refreshData();
      resetUserForm();
    } catch (e: any) {
      alert("Erro ao salvar usuário: " + (e.message || JSON.stringify(e)));
    }
    setLoading(false);
  };

  const handleConfirmDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza? Esta ação requer permissões especiais e pode falhar se não configurada.")) return;

    setLoading(true);
    const success = await UserService.deleteUser(id);
    if (success) await refreshData();
    else alert("Não foi possível excluir o usuário. (Requer funcão delete-user)");

    setDeletingUserId(null);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden relative min-h-[400px]">

      {loading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-ciclus-600 animate-spin" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'employees' ? 'bg-white text-ciclus-600 border-b-2 border-ciclus-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
        >
          <Briefcase className="w-4 h-4" /> Banco de Colaboradores
        </button>
        {currentUser.role === UserRole.CCO && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'users' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          >
            <Shield className="w-4 h-4" /> Usuários do Sistema
          </button>
        )}
      </div>

      {/* --- EMPLOYEES TAB --- */}
      {activeTab === 'employees' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-500">Cadastre os funcionários para preencher a lista de presença automaticamente.</p>
            {!isAddingEmp && (
              <button
                onClick={() => setIsAddingEmp(true)}
                className="bg-ciclus-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 hover:bg-ciclus-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Colaborador
              </button>
            )}
          </div>

          {isAddingEmp && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-blue-800 uppercase flex items-center gap-2">
                  {editingEmployeeId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingEmployeeId ? 'Editar Colaborador' : 'Novo Colaborador'}
                </h4>
                <button onClick={handleCancelEditEmployee} className="text-gray-400 hover:text-red-500 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Nome</label>
                  <input required className="w-full text-sm p-2 rounded border border-blue-200" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Matrícula</label>
                  <input required className="w-full text-sm p-2 rounded border border-blue-200" value={newEmpReg} onChange={e => setNewEmpReg(e.target.value)} placeholder="00000" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Função/Cargo</label>
                  <input
                    list="roles-list"
                    required
                    className="w-full text-sm p-2 rounded border border-blue-200"
                    value={newEmpRole}
                    onChange={e => setNewEmpRole(e.target.value)}
                    placeholder="Selecione ou digite..."
                  />
                  <datalist id="roles-list">
                    {availableRoles.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>

                {/* Foreman Selection for Employee */}
                <div>
                  <label className="text-[10px] font-bold text-blue-800 uppercase">Encarregado Responsável</label>
                  <select
                    className="w-full text-sm p-2 rounded border border-blue-200"
                    value={newEmployeeForemanId}
                    onChange={e => setNewEmployeeForemanId(e.target.value)}
                  >
                    <option value="">-- Selecione (Opcional) --</option>
                    {users.filter(u => u.role === UserRole.ENCARREGADO).map(u => (
                      <option key={u.id} value={u.id}>{u.name} - {u.team || 'Sem Equipe'}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-green-600 text-white p-2 rounded text-sm font-bold hover:bg-green-700 flex justify-center items-center gap-1">
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Encarregado</th> {/* New Column */}
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum colaborador encontrado.</td></tr>
                ) : (
                  employees.map(emp => {
                    const foremanName = users.find(u => u.id === emp.foremanId)?.name || '-';
                    return (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{emp.registration}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.role}</td>
                        <td className="px-4 py-3 text-gray-600 font-bold text-xs">{foremanName}</td> {/* New Cell */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditEmployee(emp)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Editar">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeletingEmpId(emp.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
      }

      {/* --- USERS TAB (CCO ONLY) --- */}
      {
        activeTab === 'users' && currentUser.role === UserRole.CCO && (
          <div>
            <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
              <p className="text-xs text-purple-800">Gerencie quem tem acesso ao aplicativo (Login) e vincule Supervisores às suas Equipes.</p>
              {!isAddingUser && (
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adicionar Usuário
                </button>
              )}
            </div>

            {isAddingUser && (
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-purple-800 uppercase flex items-center gap-2">
                    {editingUserId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
                  </h4>
                  <button onClick={resetUserForm} className="text-gray-400 hover:text-red-500 transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nome</label>
                    <input required className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Login (Email/Matrícula)</label>
                    <input required className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" value={newUserReg} onChange={e => setNewUserReg(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Senha</label>
                    <input required={!editingUserId} className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder={editingUserId ? "Manter atual" : "••••••••"} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nível</label>
                    <select className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                      <option value={UserRole.ENCARREGADO}>Encarregado</option>
                      <option value={UserRole.SUPERVISOR}>Supervisor</option>
                      <option value={UserRole.CCO}>CCO (Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Equipe (Opcional)</label>
                    {!isCustomTeam ? (
                      <select
                        className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newUserTeam}
                        onChange={e => {
                          if (e.target.value === "CUSTOM") {
                            setIsCustomTeam(true);
                            setNewUserTeam("");
                          } else {
                            setNewUserTeam(e.target.value);
                          }
                        }}
                      >
                        <option value="">Nenhuma</option>
                        {TEAMS.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                        <option value="CUSTOM" className="font-bold text-purple-600">+ Nova Equipe</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="w-full text-sm p-2 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="Nome da equipe"
                          autoFocus
                          value={newUserTeam}
                          onChange={e => setNewUserTeam(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => { setIsCustomTeam(false); setNewUserTeam(""); }}
                          className="p-2 text-gray-500 hover:text-red-500"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded text-sm font-bold hover:bg-green-700 flex justify-center items-center gap-1 shadow-sm transition-all active:scale-95">
                      <Save className="w-4 h-4" /> {editingUserId ? 'Atualizar' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            )
            }

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Login</th>
                    <th className="px-4 py-3">Nível</th>
                    <th className="px-4 py-3">Equipe</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{u.registration}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === UserRole.CCO ? 'bg-purple-100 text-purple-800' :
                          u.role === UserRole.SUPERVISOR ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.team ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{u.team}</span> : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditUser(u)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Editar Usuário">
                            <Pencil className="w-4 h-4" />
                          </button>

                          {u.registration !== 'admin' && currentUser.id !== u.id && (
                            <>
                              {deletingUserId === u.id ? (
                                <div className="flex gap-2 items-center">
                                  <button onClick={() => setDeletingUserId(null)} className="text-[10px] text-gray-500 hover:underline">Cancel</button>
                                  <button onClick={() => handleConfirmDeleteUser(u.id)} className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700">Confirm</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeletingUserId(u.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Excluir Usuário">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div >
        )
      }
    </div >
  );
};
