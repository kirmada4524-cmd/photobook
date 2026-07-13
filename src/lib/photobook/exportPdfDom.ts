import jsPDF from "jspdf";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Page } from "@/components/photobook/Page";
import { PAGE_SIZES } from "./types";
import { useBookStore } from "./store";

/**
 * High-fidelity PDF export.
 *
 * Instead of re-implementing every frame / shape / theme on a raw 2D canvas (which silently
 * drifts from the editor whenever a style is added), this renders each page with the REAL `Page`
 * component off-screen and rasterizes the DOM via html2canvas-pro. html2canvas-pro understands
 * the modern CSS the themes rely on (oklch, color-mix, gradients), so the output matches what the
 * user sees in the editor — including page borders and decorative frames the vector exporter can't
 * reproduce.
 *
 * The caller should fall back to the vector exporter (`exportBookPdf`) if this throws.
 */

const PAGE_ROOT_SETTLE_FRAMES = 2;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "undefined") {
      setTimeout(resolve, 16);
      return;
    }
    requestAnimationFrame(() => resolve());
  });

const settleFrames = async (count: number) => {
  for (let i = 0; i < count; i++) await nextFrame();
};

/** Wait until every <img> inside the node has finished loading (or errored). */
const waitForImages = async (node: HTMLElement) => {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        // Safety timeout so a hung image can't stall the whole export.
        setTimeout(done, 8000);
      });
    }),
  );
};

export async function exportBookPdfFromDom(title: string) {
  const { book } = useBookStore.getState();
  const pages = book.pages;
  if (pages.length === 0) throw new Error("No pages to export");

  const { width: W, height: H } = PAGE_SIZES[0];
  const orientation = W >= H ? "landscape" : "portrait";

  const html2canvas = (await import("html2canvas-pro")).default;

  // Off-screen host sized to exactly one page. Kept renderable (not display:none) so
  // html2canvas can measure and clone it, but pushed far off-screen so it never flashes.
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    `width:${W}px`,
    `height:${H}px`,
    "overflow:hidden",
    "background:#ffffff",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(host);
  const root = createRoot(host);

  const pdf = new jsPDF({ orientation, unit: "px", format: [W, H] });

  try {
    // Ensure webfonts used by text/quote elements are ready before the first raster.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      try {
        await fonts.ready;
      } catch {
        /* fonts.ready can reject in some browsers; proceed regardless */
      }
    }

    for (let i = 0; i < pages.length; i++) {
      root.render(
        createElement(
          "div",
          { style: { width: W, height: H, background: "#ffffff" } },
          createElement(Page, { pageId: pages[i].id, interactive: false }),
        ),
      );

      // Let React commit + browser lay out, then wait for images to decode.
      await settleFrames(PAGE_ROOT_SETTLE_FRAMES);
      await waitForImages(host);
      await settleFrames(1);

      const canvas = await html2canvas(host, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: W,
        height: H,
        windowWidth: W,
        windowHeight: H,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.94);
      if (i > 0) pdf.addPage([W, H], orientation);
      pdf.addImage(imgData, "JPEG", 0, 0, W, H, undefined, "FAST");

      // Free memory before the next page.
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    root.unmount();
    host.remove();
  }

  pdf.save(`${title.replace(/[^\w\s-]/g, "").trim() || "photobook"}.pdf`);
}
