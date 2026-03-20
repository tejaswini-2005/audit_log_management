import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { cookieName } from "../config/security.js";

export const auth = async (req, res, next) => {
  const token = req.cookies[cookieName];

  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};
