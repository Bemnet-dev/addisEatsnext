/**
 * In-memory order store.
 *
 * Why globalThis: Next.js bundles server code per entrypoint — pages/Server
 * Components/Server Actions and Route Handlers end up in different chunks, so
 * a plain `export const orders = []` would be evaluated twice and produce two
 * independent arrays in the same process. Orders placed through checkout would
 * then be invisible to GET /api/orders/[id] (the live-status poll), and orders
 * created through the API would be invisible to /orders and /kitchen.
 *
 * Hanging the array off globalThis makes every bundle share one store, the
 * same way a database connection is shared.
 *
 * Known limitation (documented in README.md): the store is per-process. Orders
 * reset on restart and are not shared between serverless instances — persist
 * them in a database before relying on this outside a classroom demo.
 */
const store = globalThis;

if (!store.__ADDIS_EATS_ORDERS__) {
  store.__ADDIS_EATS_ORDERS__ = [];
}

export const orders = store.__ADDIS_EATS_ORDERS__;

export function addOrder(order) {
  const newOrder = { id: `order-${Date.now()}`, ...order };
  orders.push(newOrder);
  return newOrder;
}

export function getOrderById(orderId) {
  return orders.find((order) => order.id === orderId) ?? null;
}

export function getOrders() {
  return [...orders];
}
