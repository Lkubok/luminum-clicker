
require('dotenv').config();
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();

  try {
    // Navigate to the login page
    await page.goto('https://vgbs.luminum.pl/');

    // Log in
    await page.waitForSelector('#lf');
    await page.type('#lf', process.env.LUMINUM_USERNAME);
    await page.type('input[type="password"]', process.env.LUMINUM_PASSWORD);
    await page.click('input[type="submit"]');

    // Wait for navigation to the dashboard
    await page.waitForNavigation();
    await page.screenshot({ path: 'after-login.png', fullPage: true });

    // Determine which button to click
    const dayOfWeek = new Date().getDay();
    let buttonText;

    if (dayOfWeek === 3) { // Wednesday
      buttonText = 'obecność z biura';
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday, Tuesday, Thursday, Friday
      buttonText = 'obecność z domu';
    } else {
      console.log('It is the weekend, no check-in required.');
      await browser.close();
      return;
    }

    await page.screenshot({ path: 'checkin-confirmation.png', fullPage: true });

    // Click the button
    const buttonSelector = `::-p-text(${buttonText})`;
    try {
      const button = await page.waitForSelector(buttonSelector);
      if (button) {
        await button.click();
        console.log(`Successfully clicked "${buttonText}"`);
      } else {
        throw new Error(`Button "${buttonText}" not found`);
      }
    } catch (e) {
        throw new Error(`Button "${buttonText}" not found`);
    }

    // Wait for a moment to ensure any post-click actions are visible
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save a screenshot for verification
    await page.screenshot({ path: 'checkin-confirmation.png' });
    console.log('Screenshot saved as checkin-confirmation.png');

  } catch (error) {
    console.error('An error occurred:', error);
    await page.screenshot({ path: 'error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
