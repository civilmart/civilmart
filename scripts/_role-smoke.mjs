const BASE = "http://localhost:3000";

async function adminLogin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  return res.headers.get("set-cookie").split(";")[0];
}

async function createUser(cookie, username, role) {
  const res = await fetch(`${BASE}/api/users`, {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ username, name: username, password: "test123456", role }),
  });
  const body = await res.json();
  console.log(`create ${username} (${role}):`, res.status, body.success ? "ok" : body.error);
  return body.success;
}

async function loginAs(username, password = "test123456") {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`login ${username} failed`);
  return res.headers.get("set-cookie").split(";")[0];
}

async function out(cookie, path) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  const loc = res.headers.get("location");
  console.log(`GET ${path}: ${res.status}${loc ? " -> " + loc.replace(BASE, "") : ""}`);
  return res;
}

const adminCookie = await adminLogin();
await createUser(adminCookie, "smokevisitor", "USER");
await createUser(adminCookie, "smokeviewer", "VIEWER");

const visitorCookie = await loginAs("smokevisitor");
await out(visitorCookie, "/admin");
await out(visitorCookie, "/admin/users");
await out(visitorCookie, "/api/users");

const viewerCookie = await loginAs("smokeviewer");
await out(viewerCookie, "/admin");
await out(viewerCookie, "/admin/users");
const blockedUsers = await out(viewerCookie, "/api/users");
const blocked = await blockedUsers.json();
console.log("viewer /api/users body:", JSON.stringify(blocked));

console.log("ROLE SMOKE OK");