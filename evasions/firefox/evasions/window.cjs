module.exports = async function (page, fingerprint) {
    await page.setViewportSize({
        width: fingerprint.viewport.width,
        height: fingerprint.viewport.height
    })

    await page.addInitScript((options) => {
        const windowFrame = 80
        const windowBar = 40

        window.innerWidth = options.fingerprint.viewport.width
        window.outerWidth = window.innerWidth = options.fingerprint.viewport.width
        window.availWidth = window.width = options.fingerprint.viewport.width 

        window.innerHeight = options.fingerprint.viewport.height - windowBar - windowFrame
        window.outerHeight = options.fingerprint.viewport.height 
        window.availHeight = window.height = window.innerHeight
    }, { fingerprint });
}