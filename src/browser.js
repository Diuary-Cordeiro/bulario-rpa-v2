import { chromium } from 'playwright';
import { CONFIG } from './config.js';

export async function openBrowser() {
  const browser = await chromium.launch({
    executablePath: '/snap/bin/chromium',
    headless: CONFIG.browser.headless,
    slowMo: CONFIG.browser.slowMo
  });

  return browser;
}

export async function closeBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}