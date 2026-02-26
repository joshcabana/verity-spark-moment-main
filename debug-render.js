const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));

  try {
    console.log('Navigating...');
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded.');
    const content = await page.content();
    console.log('Content length:', content.length);
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved.');
  } catch (err) {
    console.error('Error during navigation:', err);
  } finally {
    await browser.close();
  }
})();
