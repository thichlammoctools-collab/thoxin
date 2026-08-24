export const SKILLS = ['dien','nuoc','moc','dien-lanh','son','ve-sinh'] as const;
export const DISTRICTS_HCM = [
  'quan-1','quan-2','quan-3','quan-4','quan-5','quan-6','quan-7','quan-8','quan-9','quan-10',
  'quan-11','quan-12','binh-thanh','go-vap','tan-binh','tan-phu','phu-nhuan','thu-duc'
] as const;
export const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0.15');

export const BOOKING_STATUSES = ['finding','offered','accepted','in_progress','done','paid','cancelled'] as const;
export const JOB_STATUSES = ['open','assigned','in_progress','completed','paid','cancelled'] as const;
export const ORDER_STATUSES = ['created','awaiting_payment','in_progress','delivered','completed','cancelled'] as const;
export const BID_STATUSES = ['pending','accepted','rejected'] as const;
export const USER_ROLES = ['customer','worker','admin'] as const;
export const USER_STATUSES = ['active','blocked'] as const;
export const ESCROW_STATUSES = ['none','held','released','refunded'] as const;
