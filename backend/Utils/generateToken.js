import jwt from "jsonwebtoken";
import { cookieName, tokenCookieOptions } from "../config/security.js";

const generateToken = (id, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie(cookieName, token, tokenCookieOptions);
};

export default generateToken;
