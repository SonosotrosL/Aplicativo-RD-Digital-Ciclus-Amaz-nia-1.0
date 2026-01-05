import ConectorSupabase from './ConectorSupabase';
import { Employee } from '../../types';

export class EmployeeService {
    static async getEmployees(): Promise<Employee[]> {
        const client = ConectorSupabase.client;
        if (!client) return [];

        const { data, error } = await client
            .from('employees')
            .select('*')
            .order('name');

        if (error) {
            console.error('Erro ao buscar colaboradores:', error);
            return [];
        }

        return data.map(e => ({
            id: e.id,
            name: e.name,
            registration: e.registration,
            role: e.role,
            supervisorId: e.supervisor_id
        }));
    }

    static async saveEmployee(employee: Employee): Promise<boolean> {
        const client = ConectorSupabase.client;
        if (!client) return false;

        const payload = {
            name: employee.name,
            registration: employee.registration,
            role: employee.role,
            // supervisor_id: employee.supervisorId // Optional, link to current user
        };

        if (employee.id && employee.id.length > 5) {
            // Update
            const { error } = await client
                .from('employees')
                .update(payload)
                .eq('id', employee.id);
            return !error;
        } else {
            // Insert
            const { error } = await client
                .from('employees')
                .insert(payload);
            return !error;
        }
    }

    static async deleteEmployee(id: string): Promise<boolean> {
        const client = ConectorSupabase.client;
        if (!client) return false;

        const { error } = await client
            .from('employees')
            .delete()
            .eq('id', id);

        return !error;
    }

    static async getExistingRoles(): Promise<string[]> {
        const employees = await this.getEmployees();
        const defaultRoles = ['Ajudante', 'Gari', 'Pintor', 'Roçador', 'OP. Roçadeira', 'ASG', 'Motorista'];
        const dbRoles = employees.map(e => e.role);
        return Array.from(new Set([...defaultRoles, ...dbRoles])).sort();
    }
}
