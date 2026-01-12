// constants/icons.js
import {
  Wallet,
  DollarSign,
  Briefcase,
  UtensilsCrossed,
  Train,
  Zap,
  Gamepad2,
  ShoppingBag,
  Receipt,
  HelpCircle,
  Utensils, 
  Car, 
  Home, 
  Heart, 
  Coffee, 
  Shirt, 
  Smartphone, 
  Book, 
  Gift, 
  Smile, 
  Circle,
} from 'lucide-react';

// アイコンマッピング
const iconMap = {
  'Wallet': Wallet,
  'DollarSign': DollarSign,
  'Briefcase': Briefcase,
  'UtensilsCrossed': UtensilsCrossed,
  'Train': Train,
  'Zap': Zap,
  'Gamepad2': Gamepad2,
  'ShoppingBag': ShoppingBag,
  'Receipt': Receipt,
  'Utensils': Utensils,
  'Car': Car,
  'Home': Home,
  'Heart': Heart,
  'Coffee': Coffee,
  'Shirt': Shirt,
  'Smartphone': Smartphone,
  'Book': Book,
  'Gift': Gift,
  'Smile': Smile,
  'Circle': Circle,
};

/**
 * アイコン名から対応するLucideアイコンコンポーネントを取得
 * @param {string} iconName - アイコン名（例: 'Wallet', 'DollarSign'）
 * @returns {React.Component} - Lucideアイコンコンポーネント（見つからない場合はHelpCircle）
 */
export const getIcon = (iconName) => {
  return iconMap[iconName] || HelpCircle;
};

/**
 * アイコンが存在するかチェック
 * @param {string} iconName - アイコン名
 * @returns {boolean}
 */
export const hasIcon = (iconName) => {
  return iconName in iconMap;
};

export default iconMap;