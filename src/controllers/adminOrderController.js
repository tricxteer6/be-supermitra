const db = require("../config/db");

// Helper: mapping provinsi ke pulau
const PROVINCE_TO_ISLAND = {
  "DKI Jakarta": "Jawa",
  "Jawa Barat": "Jawa",
  "Jawa Tengah": "Jawa",
  "DI Yogyakarta": "Jawa",
  "Jawa Timur": "Jawa",
  Banten: "Jawa",
  "Bali": "Bali",
  "Nusa Tenggara Barat": "Nusa Tenggara",
  "Nusa Tenggara Timur": "Nusa Tenggara",
  "Aceh": "Sumatra",
  "Sumatera Utara": "Sumatra",
  "Sumatera Barat": "Sumatra",
  Riau: "Sumatra",
  "Kepulauan Riau": "Sumatra",
  "Jambi": "Sumatra",
  "Sumatera Selatan": "Sumatra",
  Bengkulu: "Sumatra",
  "Lampung": "Sumatra",
  "Kepulauan Bangka Belitung": "Sumatra",
  "Kalimantan Barat": "Kalimantan",
  "Kalimantan Tengah": "Kalimantan",
  "Kalimantan Selatan": "Kalimantan",
  "Kalimantan Timur": "Kalimantan",
  "Kalimantan Utara": "Kalimantan",
  "Sulawesi Utara": "Sulawesi",
  "Sulawesi Tengah": "Sulawesi",
  "Sulawesi Selatan": "Sulawesi",
  "Sulawesi Tenggara": "Sulawesi",
  "Sulawesi Barat": "Sulawesi",
  "Gorontalo": "Sulawesi",
  "Maluku": "Maluku",
  "Maluku Utara": "Maluku",
  "Papua": "Papua",
  "Papua Barat": "Papua",
  "Papua Tengah": "Papua",
  "Papua Selatan": "Papua",
  "Papua Pegunungan": "Papua",
};

// GET /api/admin/orders
// List semua order untuk admin produk
exports.getOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT 
        o.id,
        o.user_id,
        o.status,
        o.total,
        o.created_at,
        u.nama AS user_nama,
        u.email AS user_email,
        u.kemitraan AS user_kemitraan,
        u.mitra_id AS user_mitra_id
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC`
    );

    if (!orders.length) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o.id);
    const [items] = await db.query(
      `SELECT 
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.price,
        p.name AS product_name
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")})`,
      orderIds
    );

    const itemsByOrder = {};
    for (const it of items) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push({
        product_id: it.product_id,
        name: it.product_name || "Produk",
        quantity: it.quantity,
        price: it.price,
      });
    }

    const result = orders.map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total) || 0,
      created_at: o.created_at,
      user: {
        id: o.user_id,
        nama: o.user_nama,
        email: o.user_email,
        kemitraan: o.user_kemitraan,
        mitra_id: o.user_mitra_id,
      },
      items: itemsByOrder[o.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("ADMIN GET ORDERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin/orders/:id/accept
exports.acceptOrder = async (req, res) => {
  const orderId = req.params.id;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [orders] = await conn.query(
      "SELECT id, status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orders.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }
    const order = orders[0];
    if (order.status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Order sudah diproses" });
    }

    const [items] = await conn.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
      [orderId]
    );
    if (!items.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Order tidak memiliki item" });
    }

    // Cek stok cukup
    for (const it of items) {
      const [prods] = await conn.query(
        "SELECT id, stock, name FROM products WHERE id = ? FOR UPDATE",
        [it.product_id]
      );
      if (!prods.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: `Produk ${it.product_id} tidak ditemukan` });
      }
      const prod = prods[0];
      if (Number(prod.stock) < Number(it.quantity)) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          message: `Stok tidak cukup untuk produk: ${prod.name || it.product_id}`,
        });
      }
    }

    // Kurangi stok
    for (const it of items) {
      await conn.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [it.quantity, it.product_id]
      );
    }

    await conn.query("UPDATE orders SET status = 'accepted' WHERE id = ?", [orderId]);

    await conn.commit();
    conn.release();
    res.json({ message: "Order diterima" });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      conn.release();
    }
    console.error("ADMIN ACCEPT ORDER ERROR:", err);
    res.status(500).json({ message: "Gagal memproses order" });
  }
};

// PATCH /api/admin/orders/:id/reject
exports.rejectOrder = async (req, res) => {
  const orderId = req.params.id;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [orders] = await conn.query(
      "SELECT id, status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orders.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }
    const order = orders[0];
    if (order.status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Order sudah diproses" });
    }

    await conn.query("UPDATE orders SET status = 'rejected' WHERE id = ?", [orderId]);

    await conn.commit();
    conn.release();
    res.json({ message: "Order ditolak" });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      conn.release();
    }
    console.error("ADMIN REJECT ORDER ERROR:", err);
    res.status(500).json({ message: "Gagal menolak order" });
  }
};

// DELETE /api/admin/orders/:id - hanya boleh jika status = 'rejected'
exports.deleteOrder = async (req, res) => {
  const orderId = req.params.id;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [orders] = await conn.query(
      "SELECT id, status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );
    if (!orders.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }
    const order = orders[0];
    if (order.status !== "rejected") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Hanya order yang ditolak yang boleh dihapus" });
    }

    await conn.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    await conn.query("DELETE FROM orders WHERE id = ?", [orderId]);

    await conn.commit();
    conn.release();
    res.json({ message: "Order berhasil dihapus" });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      conn.release();
    }
    console.error("ADMIN DELETE ORDER ERROR:", err);
    res.status(500).json({ message: "Gagal menghapus order" });
  }
};

// GET /api/admin/orders/location-stats
// Statistik order berdasarkan pulau, provinsi, kota, kecamatan, kelurahan
exports.getOrderLocationStats = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        o.id,
        u.provinsi,
        u.kota,
        u.kecamatan,
        u.kelurahan
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id`
    );

    const islands = {};
    const provinces = {};
    const cities = {};
    const districts = {};
    const subdistricts = {};

    for (const r of rows) {
      const prov = (r.provinsi || "").trim();
      const kota = (r.kota || "").trim();
      const kec = (r.kecamatan || "").trim();
      const kel = (r.kelurahan || "").trim();

      const island = prov && PROVINCE_TO_ISLAND[prov] ? PROVINCE_TO_ISLAND[prov] : "Lainnya";

      islands[island] = (islands[island] || 0) + 1;
      if (prov) provinces[prov] = (provinces[prov] || 0) + 1;
      if (kota) cities[kota] = (cities[kota] || 0) + 1;
      if (kec) districts[kec] = (districts[kec] || 0) + 1;
      if (kel) subdistricts[kel] = (subdistricts[kel] || 0) + 1;
    }

    const toSortedArray = (obj) =>
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    res.json({
      islands: toSortedArray(islands),
      provinces: toSortedArray(provinces),
      cities: toSortedArray(cities),
      districts: toSortedArray(districts),
      subdistricts: toSortedArray(subdistricts),
    });
  } catch (err) {
    console.error("ADMIN ORDER LOCATION STATS ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil statistik lokasi order" });
  }
};



