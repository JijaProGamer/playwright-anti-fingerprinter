import { readFileSync } from 'node:fs';
import path from 'node:path';

import { dirname } from 'path'
import { createRequire } from 'module';
import { fileURLToPath } from 'url'

import useProxy from './proxy/proxy.js';
import { CacheResponse, SearchCache } from 'playwright-cache';

let require = createRequire(fileURLToPath(import.meta.url));
let __dirname = dirname(fileURLToPath(import.meta.url))

let commonFingerprints = {}
let evasionPlugins = {}
let networkEvasionPlugins = {}
let databases = {}

let databaseTypes = [
    "webgl_renderers",
    "compatibleMediaMimes",
    "languages",
    "userAgents",
    "canvass",
    "viewports"
]

let supportedDrivers = [
    "firefox",
    "chromium"
]

for (let driver of supportedDrivers) {
    let evasionsPosible = JSON.parse(readFileSync(path.join(__dirname, "evasions", driver, "evasions.json")))
    evasionPlugins[driver] = {}
    networkEvasionPlugins[driver] = {}
    databases[driver] = {
        cpus: [4, 8, 12, 16, 24, 32, 64, 96],
        memorys: [0.25, 0.5, 1, 2, 4, 8],
        webgl_vendors: Object.keys(JSON.parse(readFileSync(path.join(__dirname, "databases", driver, `webgl_renderers.json`))))
    }

    for (let evasion of evasionsPosible) {
        if (evasion.startsWith("network-")) {
            networkEvasionPlugins[driver][evasion] = require(path.join(__dirname, "evasions", driver, "evasions", `${evasion}.cjs`))
        } else {
            evasionPlugins[driver][evasion] = require(path.join(__dirname, "evasions", driver, "evasions", `${evasion}.cjs`))
        }
    }

    for (let databaseType of databaseTypes) {
        databases[driver][databaseType] = JSON.parse(readFileSync(path.join(__dirname, "databases", driver, `${databaseType}.json`)))
    }

    commonFingerprints[driver] = JSON.parse(readFileSync(path.join(__dirname, "databases", "common", `${driver}.json`)))
}

function shuffle(arr) {
    return [...arr]
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
}

function GetCommonFingerprint(browserType) {
    if (!commonFingerprints[browserType]) {
        throw new Error(`browser type "${browserType}" is not supported. Please use ${supportedDrivers.join(" or ")}.`)
    }

    return commonFingerprints[browserType]
}

function GenerateFingerprint(browserType, generator_options = {}) {
    if (!databases[browserType]) {
        throw new Error(`browser type "${browserType}" is not supported. Please use ${supportedDrivers.join(" or ")}.`)
    }

    let database = databases[browserType]
    generator_options = {
        webgl_vendor: (e) => e.includes("Intel") || e.includes("AMD") || e.includes("NVIDIA"),
        webgl_renderer: (e) => true,
        language: (e) => e.includes("en"),
        userAgent: (e) => e.includes("Windows"),
        viewport: (e) => e.width > 1000 && e.height > 800 && e.width < 2000 && e.height < 2000,
        cpu: (e) => e <= 24 && e >= 4,
        memory: (e) => true,
        compatibleMediaMime: (e) => e.audio.includes("aac") && e.video["mp4"] && e.video.mp4.length > 0,
        canvas: (e) => true,
        proxy: (e) => "direct://",
        ...generator_options,
    }

    let fingerprint = {}

    for (let prop in generator_options) {
        if (generator_options.hasOwnProperty(prop)) {
            if (prop == "webgl_renderer") {
                fingerprint["webgl_renderer"] =
                    typeof (generator_options["webgl_renderer"]) == "function" ?
                        shuffle(database["webgl_renderers"][fingerprint.webgl_vendor]).find(generator_options["webgl_renderer"]) :
                        generator_options["webgl_renderer"]

                continue;
            }

            let data = database[prop + "s"]

            fingerprint[prop] = typeof (generator_options[prop]) == "function" ? (
                data ? shuffle(data).find(generator_options[prop]) : generator_options[prop]()
            ) : generator_options[prop]
        }
    }

    return fingerprint
}

/*async function ConnectBrowserFingerprinter(browserType, context, options) {

}*/
async function ConnectFingerprinter(browserType, page, options) {
    let fingerprint = options.fingerprint
    if (!fingerprint) fingerprint = GenerateFingerprint(browserType);

    if (!options.cache) {
        let memoryCache = {};

        options.cache = {
            save: (URL, type, expires, Data) => {
                return new Promise((resolve, reject) => {
                    memoryCache[URL] = { expires, Data }
                    resolve()
                })
            },
            read: (URL) => {
                return new Promise((resolve, reject) => {
                    let CachedResponse = memoryCache[URL]
                    
                    if (!CachedResponse) {
                        return resolve(false)
                    }

                    if (Date.now() >= CachedResponse.expires) {
                        delete memoryCache[URL]
                        return resolve(false)
                    }

                    resolve(CachedResponse.Data)
                })
            }
        }
    }

    await page.route('**', async (route) => {
        if (await SearchCache(route, options.cache.read))
            return

        let request = route.request()

        let requestData = {
            method: request.method(),
            postData: request.postDataBuffer(),
            headers: await request.allHeaders(),
            url: request.url()
        }

        for (let plugin in networkEvasionPlugins[browserType]) {
            if (networkEvasionPlugins[browserType].hasOwnProperty(plugin)) {
                requestData = await networkEvasionPlugins[browserType][plugin](route, requestData, fingerprint)
            }
        }

        if (typeof options.requestInterceptor == "function") {
            try {
                let mode = await options.requestInterceptor(page, requestData, route)

                if (mode == "proxy" && !options.proxy)
                    mode = "direct"

                switch (mode) {
                    case "direct":
                        route.continue(requestData)
                        break
                    case "proxy":
                        useProxy(page.context(), route, { proxy: options.proxy, ...requestData })
                        break
                    case "abort":
                        route.abort()
                        break
                }
            } catch (err) {
                console.error(err)
            }
        } else {
            if (!options.proxy) {
                route.continue(requestData)
            } else {
                useProxy(page.context(), route, { proxy, ...requestData })
            }
        }
    })

    page.on('response', (response) => {
        CacheResponse(response, options.cache.save);
    });

    for (let plugin in evasionPlugins[browserType]) {
        if (evasionPlugins[browserType].hasOwnProperty(plugin)) {
            await evasionPlugins[browserType][plugin](page, fingerprint)
        }
    }
}

export { ConnectFingerprinter/*, ConnectBrowserFingerprinter*/, GetCommonFingerprint, GenerateFingerprint }
export default ConnectFingerprinter