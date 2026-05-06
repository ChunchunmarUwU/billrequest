export interface MoneyRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  category: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  importance: 'Low' | 'Medium' | 'High' | 'Very Important';
  reason: string;
  details?: string;
  needed_by_date?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_comment?: string;
  decision_date?: number | null;
  adminFinancialStateAtSubmission?: string;
  created_at: number;
  updated_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  request_id: string;
  message: string;
  is_read: boolean;
  created_at: number;
}
