'use client';

import { User, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import type { Customer } from '@/types';

interface CustomerInfoCardProps {
  customer: Customer;
  t: (key: string) => string;
}

export default function CustomerInfoCard({ customer, t }: CustomerInfoCardProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-bold">{customer.name}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </span>
            {customer.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {customer.address}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Calendar className="w-3 h-3" />
            {t('crm_customer_since')} {new Date(customer.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
