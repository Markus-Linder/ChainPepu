import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";
import { json, pricePerDayCents } from "../../../lib/ser7.server";

export const Route = createFileRoute("/api/ads/config")({
  server: {
    handlers: {
      GET: async () =>
        json({
          pricePerDayCents: pricePerDayCents(),
          currency: "EUR",
          paymentReady: Boolean(process.env.STRIPE_SECRET_KEY),
          durations: [7, 14, 30, 90],
        }),
    },
  },
});
