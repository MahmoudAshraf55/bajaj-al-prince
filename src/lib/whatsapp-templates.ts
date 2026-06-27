import { prisma } from './prisma';

export type EventKey =
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_completed'
  | 'issue_changed'
  | 'vehicle_added'
  | 'work_order_created'
  | 'work_order_started'
  | 'work_order_cancelled'
  | 'work_order_completed'
  | 'work_order_updated';

interface Variables {
  name?: string;
  model?: string;
  date?: string;
  time?: string;
  issue?: string;
  make?: string;
  cost?: string;
  work?: string;
}

export async function getTemplate(event: EventKey): Promise<string | null> {
  const template = await prisma.whatsAppMessageTemplate.findUnique({
    where: { event },
  });
  if (!template || !template.isActive) return null;
  return template.message;
}

export function applyVariables(template: string, vars: Variables): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name ?? '')
    .replace(/\{\{model\}\}/g, vars.model ?? '')
    .replace(/\{\{date\}\}/g, vars.date ?? '')
    .replace(/\{\{time\}\}/g, vars.time ?? '')
    .replace(/\{\{issue\}\}/g, vars.issue ?? '')
    .replace(/\{\{make\}\}/g, vars.make ?? '')
    .replace(/\{\{cost\}\}/g, vars.cost ?? '')
    .replace(/\{\{work\}\}/g, vars.work ?? '');
}

export async function buildMessage(event: EventKey, vars: Variables): Promise<string | null> {
  const template = await getTemplate(event);
  if (!template) return null;
  return applyVariables(template, vars);
}
