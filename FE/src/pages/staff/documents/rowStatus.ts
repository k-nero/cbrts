import type { DocumentStatus } from '@/components/ui';
import { type ChecklistItem, ChecklistStatusEnum, ValidityEnum } from '@/interfaces';

/** A checklist item's row state: cleared wins, then the validity colour, then waiting for review. */
export function rowStatus(item: ChecklistItem): DocumentStatus {
  if (item.status === ChecklistStatusEnum.CLEARED) return 'cleared';
  if (item.validity === ValidityEnum.RED) return 'red';
  if (item.validity === ValidityEnum.AMBER) return 'amber';
  if (item.status === ChecklistStatusEnum.IN_REVIEW) return 'review';
  return 'required';
}
