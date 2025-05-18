import {
  Wallet,
  CreditCard,
  Building2,
  Landmark,
  PiggyBank,
  Coins,
  DollarSign,
  Banknote,
  Building,
  CircleDollarSign,
  Vault,
  Receipt,
  Briefcase,
  CircleUserRound,
  Users,
  Baby,
  GraduationCap,
  Plane,
  Car,
  Home,
  Heart,
  Star,
  Palmtree,
  Ship,
  Train,
  Umbrella,
  Gift,
  Trophy,
  School,
  Backpack,
  Dog,
  Cat,
  Plane as Plant,
  ShoppingBag,
  ShoppingCart,
  Store,
  Shirt,
  Shapes as Shoes,
  PersonStanding,
  Ban as Man,
  Bike as Woman,
  Shield as Child,
  Smile as Family,
  Glasses,
  Book,
  Calculator,
  Smartphone,
  Laptop,
  Gamepad,
  Utensils,
  Coffee,
  Pizza,
  Dumbbell,
  ChevronFirst as FirstAid,
  Stethoscope,
  Pill,
} from 'lucide-react';

export const accountIcons = {
  // Finance & Banking
  wallet: Wallet,
  creditCard: CreditCard,
  bank: Building2,
  landmark: Landmark,
  piggyBank: PiggyBank,
  coins: Coins,
  dollar: DollarSign,
  cash: Banknote,
  building: Building,
  circleDollar: CircleDollarSign,
  vault: Vault,
  receipt: Receipt,
  briefcase: Briefcase,
  calculator: Calculator,

  // Demographics & Family
  man: Man,
  woman: Woman, // Using Skew icon which looks like a person in a dress
  child: Child,
  baby: Baby,
  family: Family,
  personStanding: PersonStanding,
  student: GraduationCap,
  users: Users,

  // Shopping & Retail
  shoppingBag: ShoppingBag,
  shoppingCart: ShoppingCart,
  store: Store,
  shirt: Shirt,
  shoes: Shoes,

  // Transportation
  plane: Plane,
  car: Car,
  ship: Ship,
  train: Train,

  // Home & Living
  home: Home,
  heart: Heart,
  umbrella: Umbrella,

  // Education & Work
  school: School,
  backpack: Backpack,
  book: Book,
  glasses: Glasses,

  // Technology
  smartphone: Smartphone,
  laptop: Laptop,
  gamepad: Gamepad,

  // Food & Dining
  utensils: Utensils,
  coffee: Coffee,
  pizza: Pizza,

  // Health & Wellness
  dumbbell: Dumbbell,
  firstAid: FirstAid,
  stethoscope: Stethoscope,
  pill: Pill,

  // Pets
  dog: Dog,
  cat: Cat,

  // Leisure & Travel
  palmtree: Palmtree,
  gift: Gift,
  trophy: Trophy,
  star: Star,
  plant: Plant,
};

export type AccountIconType = keyof typeof accountIcons;

export function getAccountIcon(iconName: AccountIconType) {
  return accountIcons[iconName];
}
