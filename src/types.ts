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

export interface WishlistItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: 'Gift' | 'Food' | 'Date' | 'Shopping' | 'Beauty' | 'Experience' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Dream';
  estimatedAmount?: number;
  status: 'Wanted' | 'Planned' | 'Done' | 'Hidden Surprise';
  createdAt: number;
  updatedAt: number;
}

export interface DateIdea {
  id: string;
  title: string;
  description?: string;
  category: 'Movie Night' | 'Food Date' | 'Coffee Date' | 'Walk' | 'Gaming' | 'Cooking Together' | 'Shopping' | 'Surprise' | 'Home Date' | 'Outdoor' | 'Other';
  location?: string;
  estimatedCost?: number;
  mood: 'Cozy' | 'Fun' | 'Romantic' | 'Chill' | 'Fancy' | 'Lazy' | 'Adventure';
  createdBy: string;
  isFavorite: boolean;
  status: 'Idea' | 'Planned' | 'Done';
  createdAt: number;
  updatedAt: number;
}
