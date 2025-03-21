const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'https://your-app-url.com';  // Replace with the actual app URL
const CREDENTIALS = { username: 'your_username', password: 'your_password' }; // Replace with the provided credentials
const SESSION_FILE = 'session.json';

(async () => {
    let browser;
    let context;

    try {
        // Check if session file exists
        if (fs.existsSync(SESSION_FILE)) {
            const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            browser = await chromium.launch();
            context = await browser.newContext({ storageState: sessionData });
            console.log('Loaded existing session.');
        } else {
            browser = await chromium.launch({ headless: false });
            context = await browser.newContext();
            const page = await context.newPage();

            // Navigate to login page
            await page.goto(BASE_URL);
            await page.fill('#username', CREDENTIALS.username);
            await page.fill('#password', CREDENTIALS.password);
            await page.click('#login-button');  // Adjust if needed
            await page.waitForNavigation();

            // Save session
            await context.storageState({ path: SESSION_FILE });
            console.log('Session saved.');
        }

        const page = await context.newPage();
        await page.goto(BASE_URL);

        // Navigate through hidden menus
        await page.click('text=Dashboard Tools');
        await page.click('text=Data Visualization');
        await page.click('text=Inventory Management');
        await page.click('text=View Product Inventory');

        // Wait for the product table
        await page.waitForSelector('table');

        let products = [];

        while (true) {
            const rows = await page.$$('table tbody tr');
            for (const row of rows) {
                const product = await row.evaluate((node) => {
                    const columns = node.querySelectorAll('td');
                    return {
                        id: columns[0]?.innerText.trim(),
                        name: columns[1]?.innerText.trim(),
                        category: columns[2]?.innerText.trim(),
                        warranty: columns[3]?.innerText.trim(),
                        stock: columns[4]?.innerText.trim(),
                        color: columns[5]?.innerText.trim(),
                        weight: columns[6]?.innerText.trim(),
                        rating: columns[7]?.innerText.trim(),
                        manufacturer: columns[8]?.innerText.trim(),
                        price: columns[9]?.innerText.trim(),
                        updated: columns[10]?.innerText.trim()
                    };
                });
                products.push(product);
            }

            // Handle pagination
            const nextButton = await page.$('text=Next');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(2000);
            } else {
                break;
            }
        }

        // Save extracted data to JSON
        fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
        console.log('Product data saved to products.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
