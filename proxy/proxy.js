import got from "got";
import CookieHandler from "./cookies.js";

import HttpProxyAgent from "http-proxy-agent";
import HttpsProxyAgent from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

const setAgent = (proxy) => {
    if (proxy.startsWith("socks")) {
        return {
            http: new SocksProxyAgent(proxy),
            https: new SocksProxyAgent(proxy)
        };
    }
    return {
        http: new HttpProxyAgent(proxy),
        https: new HttpsProxyAgent(proxy)
    };
};

const requestHandler = async (context, route, proxy, overrides = {}) => {
    let request = route.request()
    if (!request.url().startsWith("http") && !request.url().startsWith("https")) {
        request.continue()
        return
    }

    const cookieHandler = new CookieHandler(context, request)

    const options = {
        cookieJar: await cookieHandler.getCookies(),
        method: overrides.method || request.method(),
        body: overrides.postData || request.postData(),
        headers: overrides.headers || request.headers(),
        agent: setAgent(proxy),
        responseType: "buffer",
        maxRedirects: 15,
        throwHttpErrors: false,
        ignoreInvalidCookies: true,
        followRedirect: false,
    };

    try {
        const response = await got(overrides.url || request.url(), options);

        await route.fulfill({
            status: response.statusCode,
            headers: response.headers,
            body: response.body,
        });
    } catch (error) {
        await route.abort();
    }
};

const useProxy = async (context, target, data) => {
    let proxy = data.proxy
    delete data.proxy

    if (proxy) {
        await requestHandler(context, target, proxy, data);
    } else {
        target.continue(data);
    }
};

export default useProxy;