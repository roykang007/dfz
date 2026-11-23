import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { LocalizedText, SiteConfig } from '../types.ts';

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<SiteConfig>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('CUSTOMER'), // 'ADMIN' | 'CUSTOMER'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull(),
  name: jsonb('name').$type<LocalizedText>().notNull(),
  subtitle: jsonb('subtitle').$type<LocalizedText>().notNull(),
  description: jsonb('description').$type<LocalizedText>().notNull(),
  ingredients: jsonb('ingredients').$type<LocalizedText>().notNull(),
  volume: text('volume').notNull(),
  priceHkd: integer('price_hkd').notNull(),
  compareAtHkd: integer('compare_at_hkd'),
  stock: integer('stock').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK'
  featured: boolean('featured').notNull().default(true),
  tag: jsonb('tag').$type<LocalizedText | null>(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  district: text('district').notNull(),
  tier: text('tier').notNull().default('SILVER'), // 'SILVER' | 'GLACIER_GOLD' | 'CRYO_VIP'
  role: text('role').notNull().default('MEMBER'), // 'MEMBER' | 'ADMIN'
  preferredLang: text('preferred_lang').notNull().default('zh'),
  totalOrders: integer('total_orders').notNull().default(0),
  totalSpentHkd: integer('total_spent_hkd').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'SUSPENDED'
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  lastOrderAt: timestamp('last_order_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  trackingNumber: text('tracking_number').notNull().unique(),
  courier: text('courier').notNull(),
  memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
  userUid: text('user_uid'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  district: text('district').notNull(),
  address: text('address').notNull(),
  deliveryMethod: text('delivery_method').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentReference: text('payment_reference').notNull(),
  paymentStatus: text('payment_status').notNull().default('PAID'),
  orderStatus: text('order_status').notNull().default('CONFIRMED'),
  subtotalHkd: integer('subtotal_hkd').notNull(),
  shippingHkd: integer('shipping_hkd').notNull(),
  totalHkd: integer('total_hkd').notNull(),
  preferredLang: text('preferred_lang').notNull().default('zh'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: text('product_id').notNull(),
  sku: text('sku').notNull(),
  name: jsonb('name').$type<LocalizedText>().notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceHkd: integer('unit_price_hkd').notNull(),
  lineTotalHkd: integer('line_total_hkd').notNull(),
  imageUrl: text('image_url').notNull(),
});

export const shipmentEvents = pgTable('shipment_events', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(),
  location: jsonb('location').$type<LocalizedText>().notNull(),
  note: jsonb('note').$type<LocalizedText>().notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const membersRelations = relations(members, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  member: one(members, {
    fields: [orders.memberId],
    references: [members.id],
  }),
  items: many(orderItems),
  shipmentEvents: many(shipmentEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const shipmentEventsRelations = relations(shipmentEvents, ({ one }) => ({
  order: one(orders, {
    fields: [shipmentEvents.orderId],
    references: [orders.id],
  }),
}));
