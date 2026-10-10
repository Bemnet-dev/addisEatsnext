export const orders = [];

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