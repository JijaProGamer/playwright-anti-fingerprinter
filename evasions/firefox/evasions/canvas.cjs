const { withUtils } = require("../../_utils.cjs");

module.exports = async function (page, fingerprint) {
    withUtils(page).addInitScript((utils, { fingerprint }) => {
        /*const getCanvasProxyHandler = {
            apply: function (target, ctx, args) {
                const canvas = document.createElement('canvas');

                canvas.width = ctx.width;
                canvas.height = ctx.height;

                const result = utils.cache.Reflect.apply(target, ctx, args)
                let canvas_context = canvas.getContext("2d")

                let image = new Image()
                image.src = result;
                canvas_context.drawImage(image, 0, 0)

                const imageData = canvas_context.getImageData(0, 0, 100, "png");

                for (let i = 0; x < imageData.data.length; i++) {
                    imageData.data[i] = 0
                }

                let new_result = canvas.apply(canvas_element, args)

                return new_result
            }
        }

        utils.replaceWithProxy(HTMLCanvasElement.prototype, 'toDataURL', getCanvasProxyHandler)*/
    }, { fingerprint });
}