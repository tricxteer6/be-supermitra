const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const [users] = await db.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (!users.length)
    return res.status(400).json({ message: "Email not found" });

  const user = users[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match)
    return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      role: user.role
    }
  });
};
