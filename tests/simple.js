import { GetCommonFingerprint, GenerateFingerprint, LaunchBrowser, ConnectFingerprinter } from "../index.js";

function requestInterceptor(page, requestData, route) {
    return "proxy"
};

let proxy = "direct://";

(async () => {
    let fingerprint = {
        ...GenerateFingerprint("firefox"),
        proxy
    }

    const context = (await LaunchBrowser("firefox", {
        headless: false,
        serviceWorkers: "block"
    }, fingerprint)).browser

    /*const context = await browser.newContext({
        resources: 'low',
        serviceWorkers: "block"
    });*/

    context.setDefaultNavigationTimeout(0)

    //await ConnectBrowserFingerprinter(browser.browserType(), context)

    const page = (await context.pages())[0];
    await page.bringToFront();

    console.log(fingerprint)

    await ConnectFingerprinter("firefox", page, {
        fingerprint,
        requestInterceptor
    }, [])

    page.on("console", (message) => {
        if(message.text().includes("Warning"))
            return

        console.log(`${message.type()}: ${message.text()}`)
    })

    await page.goto('https://fingerprint.com/products/bot-detection/');
})();