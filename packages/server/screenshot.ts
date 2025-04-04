import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Request } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScreenshotResult {
  filePath: string;
  title: string;
  issues: string[];
}

export async function generateScreenshotFromSnapshot(
  snapshotHtml: string,
  sessionId: string,
  timestamp: number
): Promise<ScreenshotResult> {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const issues: string[] = [];
  let title = "";

  try {
    const page = await browser.newPage();

    // Set viewport to a large size to capture full page
    await page.setViewport({ width: 1920, height: 1080 });

    // Intercept and mock asset requests
    await page.setRequestInterception(true);
    page.on("request", (request: Request) => {
      const resourceType = request.resourceType();
      if (["image", "stylesheet", "font", "script"].includes(resourceType)) {
        // Mock successful response for assets
        request.respond({
          status: 200,
          contentType:
            resourceType === "image"
              ? "image/png"
              : resourceType === "stylesheet"
              ? "text/css"
              : resourceType === "font"
              ? "font/woff2"
              : "application/javascript",
          body: "",
        });
      } else {
        request.continue();
      }
    });

    // Set content and wait for network to be idle
    await page.setContent(snapshotHtml, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Get page title
    title = await page.title();

    // Get full page dimensions
    const dimensions = await page.evaluate(() => {
      return {
        width: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth
        ),
        height: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        ),
      };
    });

    // Set viewport to full page size
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
    });

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    // Generate screenshot filename
    const filename = `${sessionId}_${timestamp}.png`;
    const filePath = path.join(screenshotsDir, filename);

    // Take screenshot
    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: "png",
    });

    return {
      filePath,
      title,
      issues,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    issues.push(`Error generating screenshot: ${errorMessage}`);
    throw error;
  } finally {
    await browser.close();
  }
}
