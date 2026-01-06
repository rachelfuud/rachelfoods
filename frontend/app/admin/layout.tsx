import { AdminGuard } from '@/components/AdminGuard';
import { AdminNav } from '@/components/AdminNav';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-muted">
                <AdminNav />
                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-8">
                        {children}
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
}
