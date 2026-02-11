const db = require("../config/db");

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

      for (const item of items) {
        const productId = item.productId || item.product_id;
        const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        if (!productId) continue;

        const [products] = await conn.query(
          "SELECT id, price, stock, kemitraan FROM products WHERE id = ?",
          [productId]
        );
        if (!products.length) {
          await conn.rollback();
          return res.status(400).json({ message: `Produk ${productId} tidak ditemukan` });
        }
        const product = products[0];
        const userKemitraan = req.user?.kemitraan || null;
        if (userKemitraan && product.kemitraan != null && product.kemitraan !== userKemitraan) {
          await conn.rollback();
          return res.status(403).json({ message: "Produk tidak tersedia untuk kemitraan Anda" });
        }
        if (product.stock < quantity) {
          await conn.rollback();
          return res.status(400).json({
            message: `Stok tidak cukup untuk produk: ${productId}`,
          });
        }
        const subtotal = Number(product.price) * quantity;
        total += subtotal;
        orderItems.push({
          product_id: productId,
          quantity,
          price: product.price,
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
        await conn.query(
          "UPDATE products SET stock = stock - ? WHERE id = ?",
          [oi.quantity, oi.product_id]
        );
      }

      await conn.commit();
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
