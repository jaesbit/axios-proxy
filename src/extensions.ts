
/**
 * Generate random number between low and high
 * @param {Number} low Low rage to generate random value
 * @param {Number} high High range to generate random value
 * @returns {Number} Random number generated
 */
function random(low: number, high: number) {
    return Math.floor(Math.random() * (high - low + 1) + low)
}

Math.randomRange = random
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = characters.length;


function makeid(length: number): string {
    var result = '';
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

String.random = makeid

export default {
    Math,
    String
}