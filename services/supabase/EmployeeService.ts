import { supabase } from '../../lib/supabaseClient';
import { Employee } from '../../types';

export class EmployeeService {
    static async getEmployees(): Promise<Employee[]> {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('name');

        if (error) {
            console.error('Erro ao buscar colaboradores:', error);
            return [];
        }

        return data.map((e: any) => ({
            id: e.id,
            name: e.name,
            registration: e.registration,
            role: e.role,
            supervisorId: e.supervisor_id,
            foremanId: e.foreman_id // Map new field
        }));
    }

    static async saveEmployee(employee: Employee): Promise<boolean> {
        const payload = {
            name: employee.name,
            registration: employee.registration,
            role: employee.role,
            foreman_id: employee.foremanId || null // Save new field
        };

        if (employee.id && employee.id.length > 5) {
            // Update
            const { error } = await supabase
                .from('employees')
                .update(payload)
                .eq('id', employee.id);
            return !error;
        } else {
            // Insert
            const { error } = await supabase
                .from('employees')
                .insert(payload);
            return !error;
        }
    }

    static async deleteEmployee(id: string): Promise<boolean> {
        const { error } = await supabase
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

