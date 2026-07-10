import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yaara - Custom Photobook Studio" },
      {
        name: "description",
        content:
          "Design beautiful 5.5×5.5 photobooks for birthdays, weddings, travel, family stories, and gifts — with easy templates, stickers, and print-ready PDF export.",
      },
    ],
  }),
  component: LandingPage,
});
