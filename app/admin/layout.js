import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }) {
  const token = cookies().get('lb_admin_token')?.value;
  const admin = token ? verifyAdminToken(token) : null;

  if (!admin) return <>{children}</>;

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
