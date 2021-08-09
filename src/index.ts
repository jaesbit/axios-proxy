import * as ext from "./extensions.js"

import { AxiosProxy as _AxiosProxy, Options as _Options } from "./core.js"
import { options as _commander } from "./commander.js"
import * as _interfaces from "./interfaces.js"

export const commander = _commander
export const Options = _Options
export const AxiosProxy = _AxiosProxy
export const interfaces = _interfaces

export default {
    ext,
    AxiosProxy,
    Options,
    commander,
    interfaces,
}
