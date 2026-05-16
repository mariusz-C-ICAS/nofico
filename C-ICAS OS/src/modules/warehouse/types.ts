import { Timestamp } from 'firebase/firestore';

export type CostingMethod = 'FIFO' | 'LIFO' | 'AVERAGE';
export type MovementType = 'PZ' | 'WZ' | 'MM_IN' | 'MM_OUT' | 'RW' | 'PW' | 'INVENTORY_ADJUSTMENT';
export type MovementStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type StockStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type InventoryCountStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z';
export type ReplenishmentStatus = 'PENDING' | 'ORDERED' | 'DISMISSED';
export type MarketplaceProvider = 'ALLEGRO' | 'AMAZON' | 'SHOPIFY';

export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  location?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface WarehouseProduct {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  unit: string;
  costingMethod: CostingMethod;
  currentStock: number;
  reservedStock: number;
  minStock: number;
  reorderQuantity: number;
  unitCostAverage: number;
  status: StockStatus;
  warehouseId: string;
  supplierId?: string;
  kseImportedFrom?: string;
  gtinBarcode?: string;
  abcClass?: AbcClass;
  xyzClass?: XyzClass;
  batchTracking: boolean;
  serialTracking: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface StockLot {
  id: string;
  productId: string;
  warehouseId: string;
  tenantId: string;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  receivedAt: Timestamp;
  movementId: string;
  expiresAt?: Timestamp;
  batchNumber?: string;
}

export interface StockMovementItem {
  productId: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  batchNumber?: string;
  serialNumber?: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  warehouseId: string;
  targetWarehouseId?: string;
  type: MovementType;
  status: MovementStatus;
  items: StockMovementItem[];
  documentNumber: string;
  referenceDocumentId?: string;
  createdBy: string;
  confirmedBy?: string;
  notes?: string;
  createdAt: Timestamp;
  confirmedAt?: Timestamp;
}

export interface InventoryCount {
  id: string;
  tenantId: string;
  warehouseId: string;
  status: InventoryCountStatus;
  items: InventoryCountItem[];
  startedBy: string;
  completedBy?: string;
  discrepancyValue: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface InventoryCountItem {
  productId: string;
  expectedQuantity: number;
  countedQuantity: number;
  discrepancy: number;
  unitCost: number;
}

export interface ReplenishmentAlert {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  minStock: number;
  suggestedOrderQuantity: number;
  supplierId?: string;
  status: ReplenishmentStatus;
  createdAt: Timestamp;
}

export interface AbcXyzResult {
  productId: string;
  totalRevenue: number;
  revenueShare: number;
  cumulativeShare: number;
  abcClass: AbcClass;
  demandCV: number;
  xyzClass: XyzClass;
}
