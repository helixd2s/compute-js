/*
const assert = require("assert");
const myModule = require("..");
assert.equal(myModule.add(1, 2), 3);
console.log("ok");
*/

//const fs = require("fs");
//const loader = require("@assemblyscript/loader");
//const compute = require("../compute");
import * as compute from "../compute/index.js";
import * as loader from "@assemblyscript/loader";
import * as fs from "fs";

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

(async ()=>{
    let code = fs.readFileSync(__dirname + "/../build/optimized.wasm");

    await compute.worker(); // promise webworker for nodejs
    let kernel = new compute.compute({
        assemblyCode: toArrayBuffer(code),
        threadCount: 6,
        maxMemory: 65536
    });

    let results = await kernel.execute("main", 0);
    console.log(results.thread(0).u32().get());

})();
