# Axios Proxy

Simple library to proxify axios instances and made parallel requests with independent proxy


# Backward compatibility


Common usage

```Javascript
// Before
import axios from "axios-library"
const axios = require("axios-library")
axios.setup({}: IOptions)
...
const resp = axios.get("https://example.com")

// Now
import { AxiosProxy, Options } from "axios-proxy"
const { AxiosProxy, Options } = require("axios-proxy").defaults

const options = new Options()
const axios = new AxiosProxy(options)
...
const resp = axios.get("https://example.com")

```


With Commander

```Javascript
// Before
import axios from "axios-library"
const axios = require("axios-library")
...
const resp = axios.get("https://example.com")

// Now

import {AxiosProxy, commander} from "axios-proxy"
const axios = new AxiosProxy(commander)
...
const resp = axios.get("https://example.com")

```


