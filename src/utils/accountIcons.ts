import { Wallet, CreditCard, Building2, Landmark, PiggyBank, Coins, DollarSign, Banknote, Building, CircleDollarSign, Vault, Receipt, Briefcase, Gem, BadgeDollarSign, CircleUserRound, Users, Baby, GraduationCap, Plane, Car, Home, Heart, Star, Palmtree, Ship, Train, Umbrella, Gift, Trophy, School, Backpack, Dog, Cat, Plane as Plant } from 'lucide-react';

export const accountIcons = {
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
  shared: Users,
  family: Users,
  baby: Baby,
  student: GraduationCap,
  plane: Plane,
  car: Car,
  home: Home,
  heart: Heart,
  vacation: Palmtree,
  ship: Ship,
  train: Train,
  umbrella: Umbrella,
  gift: Gift,
  trophy: Trophy,
  school: School,
  backpack: Backpack,
  dog: Dog,
  cat: Cat,
  plant: Plant
};

export type AccountIconType = keyof typeof accountIcons;

export function getAccountIcon(iconName: AccountIconType) {
  return accountIcons[iconName];
}