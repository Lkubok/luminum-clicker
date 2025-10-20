require('dotenv').config();
const puppeteer = require('puppeteer');
const cron = require('node-cron');

const runCheckIn = async () => {
  console.log('Starting check-in process...');
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1920, height: 1080 },
    // Required for running in Docker
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    // Navigate and log in
    await page.goto('https://vgbs.luminum.pl/');
    await page.waitForSelector('#lf');
    await page.type('#lf', process.env.LUMINUM_USERNAME);
    await page.type('input[type="password"]', process.env.LUMINUM_PASSWORD);
    await page.click('input[type="submit"]');
    await page.waitForNavigation();
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('Login successful, screenshot saved.');

    // Determine which element to click
    const dayOfWeek = new Date().getDay();
    let elementText;

    if (dayOfWeek === 3) { // Wednesday
      elementText = 'Obecność - Biuro';
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday, Tuesday, Thursday, Friday
      elementText = 'Obecność - Dom';
    } else {
      console.log('It is the weekend, no check-in required.');
      await browser.close();
      return;
    }

    // Find and click the element
    const xpath = `//div[contains(@class, 'tile-text') and normalize-space(.) = '${elementText}']`;
    const elementHandle = await page.evaluateHandle((xpath) => {
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
    }, xpath);

    if (elementHandle && (await elementHandle.asElement())) {
        await elementHandle.asElement().click();
        console.log(`Successfully clicked "${elementText}"`);
    } else {
        throw new Error(`Element with text "${elementText}" not found`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'checkin-confirmation.png', fullPage: true });
    console.log('Confirmation screenshot saved.');

  } catch (error) {
    console.error('An error occurred during the check-in process:', error);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
};

// Decide whether to run immediately or schedule the task
if (process.argv.includes('--run')) {
  console.log('Running check-in process immediately for debugging...');
  runCheckIn();
} else {
  const cronSchedule = process.env.CRON_SCHEDULE;
  if (cron.validate(cronSchedule)) {
    console.log(`Scheduler started. Waiting for the job to run at: ${cronSchedule}`);
    cron.schedule(cronSchedule, runCheckIn);
  } else {
    console.error('Invalid CRON schedule in .env file. Please check CRON_SCHEDULE.');
    process.exit(1);
  }
}