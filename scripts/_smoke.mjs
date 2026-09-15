const BASE = "http://localhost:3000";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`login failed: ${JSON.stringify(body)}`);
  const cookie = res.headers.get("set-cookie").split(";")[0];
  console.log("login ok:", body.data.username, "| cookie:", cookie.slice(0, 30));
  return cookie;
}

async function me(cookie) {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
  const body = await res.json();
  console.log("me:", res.status, body.success ? body.data.username : body.error);
  if (!body.success) throw new Error("me failed");
}

async function listOrders(cookie) {
  const res = await fetch(`${BASE}/api/orders`, { headers: { cookie } });
  const body = await res.json();
  console.log("admin orders:", body.data.length, "| latest:", body.data[0]?.orderNumber, body.data[0]?.status);
  return body.data[0];
}

async function advance(cookie, id, status) {
  const res = await fetch(`${BASE}/api/orders/${id}`, {
    method: "PATCH",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ status, note: "smoke-test advance" }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`patch ${status} failed: ${JSON.stringify(body)}`);
  const last = body.data.statusEvents[body.data.statusEvents.length - 1];
  console.log(`patch -> ${status}: status=${body.data.status} events=${body.data.statusEvents.length} lastEvent=${last.status}`);
  return body.data;
}

async function track(orderNumber, phone) {
  const res = await fetch(`${BASE}/api/store/orders/${orderNumber}?phone=${encodeURIComponent(phone)}`);
  const body = await res.json();
  if (!body.success) throw new Error("track failed: " + JSON.stringify(body));
  const events = body.data.statusEvents.map((e) => e.status).join(" > ");
  console.log(`track ${orderNumber}: status=${body.data.status} timeline=[${events}]`);
}

async function customerLogin(identifier, password) {
  const res = await fetch(`${BASE}/api/store/customers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`customer login failed: ${JSON.stringify(body)}`);
  const cookie = res.headers.get("set-cookie").split(";")[0];
  console.log("customer login ok:", body.data.username, "| cookie:", cookie.slice(0, 30));
  return cookie;
}

async function wishlist(cookie, productId, expect) {
  let res = await fetch(`${BASE}/api/store/wishlist`, { headers: { cookie } });
  let body = await res.json();
  if (!body.success) throw new Error("wishlist GET failed: " + JSON.stringify(body));
  const beforeCount = body.data.length;
  console.log(`wishlist GET: ${beforeCount} item(s)`);

  res = await fetch(`${BASE}/api/store/wishlist`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  body = await res.json();
  if (!body.success) throw new Error("wishlist toggle failed: " + JSON.stringify(body));
  console.log(`wishlist toggle -> wishlisted=${body.data.wishlisted} (expected ${expect})`);
  if (body.data.wishlisted !== expect) throw new Error("wishlist toggle wrong result");

  res = await fetch(`${BASE}/api/store/wishlist`, { headers: { cookie } });
  body = await res.json();
  return body.data.length;
}

const cookie = await login();
await me(cookie);
const order = await listOrders(cookie);
if (!order) {
  console.log("No orders yet — placing one first.");
  const products = (await (await fetch(`${BASE}/api/store/products`)).json()).data;
  const v = products[0].variants[0];
  const placed = await (
    await fetch(`${BASE}/api/store/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        useLoggedIn: false,
        customer: {
          name: "Node Smoke Buyer",
          username: "nodesmoke",
          password: "test123456",
          email: "nodesmoke@example.com",
          phone: "03151234567",
          address: "42 Test Road, Lahore",
          city: "Lahore",
        },
        items: [{ variantId: v.id, quantity: 1 }],
        shipping: 0,
      }),
    })
  ).json();
  console.log("placed:", placed.data?.order.orderNumber, placed.data?.order.status);
  const relist = await listOrders(cookie);
  await advance(cookie, relist.id, "CONFIRMED");
  await advance(cookie, relist.id, "SHIPPED");
  await track(placed.data.order.orderNumber, "03151234567");
} else {
  await advance(cookie, order.id, "CONFIRMED");
  await advance(cookie, order.id, "SHIPPED");
  await track(order.orderNumber, order.phone);
}

const products = (await (await fetch(`${BASE}/api/store/products`)).json()).data;
const productId = products[0].id;
const cCookie = await customerLogin("smoketest1", "test123456");
const afterAdd = await wishlist(cCookie, productId, true);
const afterRemove = await wishlist(cCookie, productId, false);
if (afterRemove !== afterAdd - 1) throw new Error("wishlist count mismatch after remove");
console.log("wishlist smoke ok (add + remove)");

const unauth = await fetch(`${BASE}/api/store/wishlist`);
if (unauth.status !== 401) throw new Error(`unauth wishlist expected 401, got ${unauth.status}`);
console.log("unauth wishlist -> 401 ok");

// Admin should be able to sign in on the storefront as a customer.
const adminCustomer = await customerLogin("admin", "admin123");
let meRes = await fetch(`${BASE}/api/store/customers`, { headers: { cookie: adminCustomer } });
let meBody = await meRes.json();
console.log("admin-as-customer me:", meBody.data.username, "isStaff=" + meBody.data.isStaff);
if (!meBody.data.isStaff) throw new Error("expected linked staff customer");

// Admin orders on the storefront; missing delivery details must be saved to their profile.
const adminProducts = (await (await fetch(`${BASE}/api/store/products`)).json()).data;
const adminVariant = adminProducts[0].variants[0];
const placed = await (
  await fetch(`${BASE}/api/store/orders`, {
    method: "POST",
    headers: { cookie: adminCustomer, "Content-Type": "application/json" },
    body: JSON.stringify({
      useLoggedIn: true,
      customer: {
        name: "Administrator",
        username: "admin",
        email: "admin@civilmart.com",
        phone: "03221234567",
        address: "Civil Mart Head Office, Main Bazaar",
        city: "Lahore",
      },
      items: [{ variantId: adminVariant.id, quantity: 1 }],
      shipping: 0,
    }),
  })
).json();
if (!placed.success) throw new Error("admin order failed: " + JSON.stringify(placed));
console.log("admin placed order:", placed.data.order.orderNumber, placed.data.order.status);

const adminOrders = await (await fetch(`${BASE}/api/store/orders`, { headers: { cookie: adminCustomer } })).json();
if (!adminOrders.data.some((o) => o.orderNumber === placed.data.order.orderNumber)) {
  throw new Error("admin store order not visible in own history");
}
console.log("admin store order count:", adminOrders.data.length);
console.log("SMOKE OK");