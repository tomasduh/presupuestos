export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_path: string | null;
  category_id: string | null;
  category_name: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  name: string;
  created_at: string;
  total: number;
  item_count: number;
}

export interface BudgetItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  image_path: string | null;
  category_id: string | null;
  category_name: string | null;
}

export interface BudgetDetail {
  id: string;
  name: string;
  created_at: string;
  items: BudgetItem[];
}
