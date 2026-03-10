import { createFileRoute } from "@tanstack/react-router";
import { hash } from "bcryptjs";
import { connectDB } from "#/server/db";
import { User } from "#/server/models/user";
import { Account } from "#/server/models/account";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await connectDB();
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
          return Response.json(
            { error: "Name, email, and password are required" },
            { status: 400 }
          );
        }

        const existing = await User.findOne({ email });
        if (existing) {
          return Response.json(
            { error: "Email already registered" },
            { status: 409 }
          );
        }

        const hashed = await hash(password, 12);
        const user = await User.create({ name, email });
        await Account.create({
          accountId: user._id.toString(),
          providerId: "credentials",
          userId: user._id,
          password: hashed,
        });

        return Response.json({ ok: true, userId: user._id });
      },
    },
  },
});
