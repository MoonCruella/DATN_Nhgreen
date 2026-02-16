import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .nonempty("Email không được để trống")
    .regex(/^(?:\S+@\S+\.\S+|\d{10})$/, "Email không hợp lệ"),
  password: z.string().nonempty("Mật khẩu không được để trống"),
});
