
import { RDData, RDStatus, Employee, User, UserRole, ServiceCategory, Base, Shift } from "../types";

const STORAGE_KEY_RDS = 'ciclus_rds_v3';
const STORAGE_KEY_EMPLOYEES = 'ciclus_employees_v2';
const STORAGE_KEY_USERS = 'ciclus_users_v1';

// --- RDs ---

export const getRDs = async (): Promise<RDData[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const stored = localStorage.getItem(STORAGE_KEY_RDS);
  if (stored) return JSON.parse(stored);
  
  // SEED DATA: Generate demo data if empty
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mockRDs: RDData[] = [
    {
        id: 'rd-demo-1',
        date: today.toISOString(),
        foremanId: 'u3', foremanName: 'Enc. João', foremanRegistration: '3030',
        supervisorId: 'u2', // Sup. Maria
        status: RDStatus.APPROVED,
        serviceCategory: ServiceCategory.CAPINACAO_GRUPO,
        base: Base.NORTE, shift: Shift.DIURNO,
        street: 'Rua das Flores', neighborhood: 'Centro', perimeter: '10 ao 200',
        // Fix: Removed 'varricaoM' to match ProductionMetrics interface
        metrics: { capinaM: 2100, pinturaViasM: 1000, pinturaPostesUnd: 10, rocagemM2: 500 },
        teamAttendance: [], createdAt: Date.now(),
        segments: []
    },
    {
        id: 'rd-demo-2',
        date: yesterday.toISOString(),
        foremanId: 'u3', foremanName: 'Enc. João', foremanRegistration: '3030',
        supervisorId: 'u2', // Sup. Maria
        status: RDStatus.APPROVED,
        serviceCategory: ServiceCategory.MUTIRAO,
        base: Base.NORTE, shift: Shift.DIURNO,
        street: 'Av. Brasil', neighborhood: 'Industrial', perimeter: 'Toda extensão',
        // Fix: Removed 'varricaoM' to match ProductionMetrics interface
        metrics: { capinaM: 1800, pinturaViasM: 0, pinturaPostesUnd: 0, rocagemM2: 1200 },
        teamAttendance: [], createdAt: Date.now(),
        segments: []
    },
    {
        id: 'rd-demo-3',
        date: today.toISOString(),
        foremanId: 'u4', foremanName: 'Enc. Pedro', foremanRegistration: '4040',
        supervisorId: 'u5', // Sup. Carlos
        status: RDStatus.PENDING,
        serviceCategory: ServiceCategory.CAPINACAO_GRUPO,
        base: Base.SUL, shift: Shift.DIURNO,
        street: 'Rua Principal', neighborhood: 'Sul', perimeter: 'Norte ao Sul',
        // Fix: Removed 'varricaoM' to match ProductionMetrics interface
        metrics: { capinaM: 2500, pinturaViasM: 200, pinturaPostesUnd: 5, rocagemM2: 0 },
        teamAttendance: [], createdAt: Date.now(),
        segments: []
    }
  ];

  localStorage.setItem(STORAGE_KEY_RDS, JSON.stringify(mockRDs));
  return mockRDs;
};

export const saveRD = async (rd: RDData): Promise<RDData> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const current = await getRDs();
  
  // Assign ID if new
  if (!rd.id) {
    rd.id = `RD-${Date.now()}`;
  }

  const index = current.findIndex(item => item.id === rd.id);
  
  if (index >= 0) {
    current[index] = rd;
  } else {
    current.push(rd);
  }
  
  localStorage.setItem(STORAGE_KEY_RDS, JSON.stringify(current));
  return rd;
};

export const deleteRD = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getRDs();
  const filtered = current.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY_RDS, JSON.stringify(filtered));
};

export const updateRDStatus = async (id: string, status: RDStatus, note?: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getRDs();
  const index = current.findIndex(item => item.id === id);
  
  if (index >= 0) {
    current[index].status = status;
    if (note) current[index].supervisorNote = note;
    if (status === RDStatus.PENDING) current[index].supervisorNote = undefined;
    
    localStorage.setItem(STORAGE_KEY_RDS, JSON.stringify(current));
  }
};

// --- Employees ---

export const getEmployees = async (): Promise<Employee[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const stored = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (stored) return JSON.parse(stored);
  
  const mockEmployees: Employee[] = [
    { id: 'e1', name: 'Carlos Silva', registration: '1001', role: 'Ajudante', supervisorId: 'u2' },
    { id: 'e2', name: 'Roberto Santos', registration: '1002', role: 'Pintor', supervisorId: 'u2' },
    { id: 'e3', name: 'Ana Pereira', registration: '1003', role: 'Gari', supervisorId: 'u2' },
  ];
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(mockEmployees));
  return mockEmployees;
};

export const saveEmployee = async (employee: Employee): Promise<Employee> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getEmployees();
  
  if (!employee.id) employee.id = `emp-${Date.now()}`;
  
  const index = current.findIndex(e => e.id === employee.id);
  if (index >= 0) {
    current[index] = employee;
  } else {
    current.push(employee);
  }
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(current));
  return employee;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getEmployees();
  const filtered = current.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(filtered));
};

export const getExistingRoles = async (): Promise<string[]> => {
  const defaultRoles = ['Ajudante', 'Gari', 'Pintor', 'Roçador', 'OP. Roçadeira', 'ASG', 'Motorista'];
  const employees = await getEmployees();
  const dbRoles = employees.map(e => e.role);
  return Array.from(new Set([...defaultRoles, ...dbRoles])).sort();
};

// --- Users / Auth ---

export const getUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  if (stored) return JSON.parse(stored);

  // Seed Users
  const seedUsers: User[] = [
    { id: 'u1', name: 'Admin Geral', registration: 'admin', password: '123', role: UserRole.CCO },
    { id: 'u2', name: 'Sup. Maria', registration: '2020', password: '123', role: UserRole.SUPERVISOR, team: 'S10' }, 
    { id: 'u3', name: 'Enc. João', registration: '3030', password: '123', role: UserRole.ENCARREGADO },
    { id: 'u4', name: 'Enc. Pedro', registration: '4040', password: '123', role: UserRole.ENCARREGADO },
    { id: 'u5', name: 'Sup. Carlos', registration: '5050', password: '123', role: UserRole.SUPERVISOR, team: 'S01' }
  ];
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seedUsers));
  return seedUsers;
};

export const saveUser = async (user: User): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getUsers();
  
  if (!user.id) user.id = `usr-${Date.now()}`;
  
  const index = current.findIndex(u => u.id === user.id);
  if (index >= 0) {
    current[index] = user;
  } else {
    current.push(user);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(current));
  return user;
};

export const deleteUser = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const current = await getUsers();
  const filtered = current.filter(u => u.id !== id);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(filtered));
};

export const authenticate = async (registration: string, password: string): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const users = await getUsers();
  const user = users.find(u => u.registration === registration && u.password === password);
  
  if (user) {
    localStorage.setItem('ciclus_token', 'mock-token-' + Date.now());
    localStorage.setItem('ciclus_user', JSON.stringify(user));
    return user;
  }
  return null;
};

export const getCachedUser = (): User | null => {
  const stored = localStorage.getItem('ciclus_user');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('ciclus_token');
  localStorage.removeItem('ciclus_user');
};
