import { firefox } from "playwright"
import { GetCommonFingerprint, GenerateFingerprint/*, ConnectBrowserFingerprinter*/, ConnectFingerprinter } from "./index.js";

function requestInterceptor(page, requestData, route) {
    return "proxy"
};

let proxy = "direct://";

(async () => {
    const browser = await firefox.launch({
        headless: false,
    });

    const context = await browser.newContext({
        resources: 'low',
        serviceWorkers: "block"
    });

    context.setDefaultNavigationTimeout(0)

    //await ConnectBrowserFingerprinter(browser.browserType(), context)

    const page = await context.newPage();
    await page.bringToFront();

    await ConnectFingerprinter("firefox", page, {
        fingerprint: {
            ...GenerateFingerprint("firefox"),
            proxy
        },
        requestInterceptor
    })

    page.on("console", (message) => {
        if(message.text().includes("Warning"))
            return

        console.log(`${message.type()}: ${message.text()}`)
    })

    //await page.goto("https://www.bloxxy.net")

    //await page.goto("https://www.youtube.com/watch?v=0o2aA4fHhoo")

    //await page.goto("https://whoer.net")
    
    //await page.goto("https://jsfiddle.net/jdias/ztpBF/", {waitUntil: "networkidle"})

    await page.goto("https://iphey.com/")

    //await page.goto("https://youtube.com")
    //await page.goto("https://amiunique.org/fingerprint")

    //await page.goto('https://fingerprint.com/products/bot-detection/');
})();
