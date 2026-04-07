const db = require("../config/db");
const { createNotification } = require("../utils/notifications");

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body; // [{ productId, quantity }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items tidak boleh kosong" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let total = 0;
      const orderItems = [];

      const role = req.user?.role || "user";

      for (const item of items) {
        const productId = item.productId || item.product_id;
        const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        if (!productId) continue;

        const [products] = await conn.query(
          "SELECT id, price, price_free, price_vip, stock, kemitraan FROM products WHERE id = ?",
          [productId]
        );
        if (!products.length) {
          await conn.rollback();
          return res.status(400).json({ message: `Produk ${productId} tidak ditemukan` });
        }
        const product = products[0];
        const userKemitraan = req.user?.kemitraan || null;
        if (userKemitraan) {
          const kemStr = (product.kemitraan || "").trim();
          const list = kemStr ? kemStr.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
          const userKems = String(userKemitraan).trim().split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          const allowed = list.length === 0 || userKems.some((uk) => list.includes(uk));
          if (!allowed) {
            await conn.rollback();
            return res.status(403).json({ message: "Produk tidak tersedia untuk kemitraan Anda" });
          }
        }
        if (product.stock < quantity) {
          await conn.rollback();
          return res.status(400).json({
            message: `Stok tidak cukup untuk produk: ${productId}`,
          });
        }

        const basePrice =
          product.price_free != null ? Number(product.price_free) : Number(product.price);
        const vipPrice =
          product.price_vip != null ? Number(product.price_vip) : basePrice;
        const unitPrice =
          role === "vip" || role === "admin" ? vipPrice : basePrice;

        const subtotal = unitPrice * quantity;
        total += subtotal;
        orderItems.push({
          product_id: productId,
          quantity,
          price: unitPrice,
        });
      }

      if (orderItems.length === 0) {
        await conn.rollback();
        return res.status(400).json({ message: "Items tidak valid" });
      }

      const [orderResult] = await conn.query(
        "INSERT INTO orders (user_id, status, total) VALUES (?, 'pending', ?)",
        [userId, total]
      );
      const orderId = orderResult.insertId;

      for (const oi of orderItems) {
        await conn.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, oi.product_id, oi.quantity, oi.price]
        );
        // Stok tidak dikurangi di sini; dikurangi saat admin Accept di halaman Kelola Order
      }

      await conn.commit();

      void (async () => {
        try {
          const [adminRows] = await db.query(
            "SELECT id FROM users WHERE LOWER(TRIM(role)) = 'admin'",
          );
          const [buyerRows] = await db.query(
            "SELECT nama, mitra_id FROM users WHERE id = ?",
            [userId],
          );
          const b = buyerRows && buyerRows[0];
          const buyerLabel = b?.nama
            ? `${b.nama}${b.mitra_id ? ` (${b.mitra_id})` : ""}`
            : `User #${userId}`;
          const totalStr = Number(total).toLocaleString("id-ID");
          const msg = `${buyerLabel} mengirim pesanan #${orderId}. Total Rp ${totalStr}. Buka Kelola Order untuk memproses.`;
          for (const row of adminRows || []) {
            createNotification(row.id, {
              type: "new_order",
              title: "Pesanan baru",
              message: msg,
            });
          }
        } catch (notifyErr) {
          console.error("NOTIFY ADMINS NEW ORDER:", notifyErr);
        }
      })();

      res.status(201).json({
        message: "Pesanan berhasil dibuat",
        orderId,
        total,
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ message: "Gagal membuat pesanan" });
  }
};
