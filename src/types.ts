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
  request_id?: string;
  questId?: string;
  message: string;
  type?: string;
  title?: string;
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
  estimatedPointValue?: number;
  status: 'Wanted' | 'Claimed' | 'Granted';
  claimedAt?: number;
  grantedAt?: number;
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PrincessPoints {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: number;
}

export interface PointHistory {
  id: string;
  userId: string;
  type: 'earned' | 'spent';
  sourceType: 'quest' | 'wishlist';
  sourceId: string;
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  pointReward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  status: 'Active' | 'Submitted' | 'Completed' | 'Rejected' | 'Expired';
  assignedTo?: string;
  createdBy: string;
  proofText?: string;
  adminComment?: string;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
  approvedAt?: number;
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
