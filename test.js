import { firefox } from "playwright"
import { GetCommonFingerprint, GenerateFingerprint/*, ConnectBrowserFingerprinter*/, ConnectFingerprinter } from "./index.js";

function requestInterceptor(page, requestData, route) {
    let request = route.request()

    if(request.resourceType() == "image"){
        return "continue"
    }

    return "proxy"
};

(async () => {
    const browser = await firefox.launch({
        headless: false,
    });

    const context = await browser.newContext({
        resources: 'low',
        serviceWorkers: "block"
    });

    await context.setDefaultNavigationTimeout(0)

    //await ConnectBrowserFingerprinter(browser.browserType(), context)

    const page = await context.newPage();
    await page.bringToFront();

    await ConnectFingerprinter("firefox", page, {
        fingerprint: {
            ...GenerateFingerprint("firefox"),
            proxy: "direct"
        },
        requestInterceptor
    })

    await page.goto("https://youtube.com")
    //await page.goto("https://amiunique.org/fingerprint")

    //await page.goto('https://fingerprint.com/products/bot-detection/');
    //await page.goto("https://www.whatismybrowser.com/detect/what-is-my-user-agent/")
})();
