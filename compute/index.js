
//import * as WT from 'worker_threads';

//import { ThisExpression } from 'assemblyscript';

let WP = new Promise(async (resolve, reject) => {
    if (typeof Worker === "undefined") {
        let WP = typeof require !== "undefined" ? require('worker_threads') : (await import('worker_threads'));
        global.Worker = WP.Worker;
        resolve(WP);
    }
});

export function worker(){
    return WP;
};

// 
let encodeDataURL = (code, mime = "text/javascript") => {
    if (typeof URL !== "undefined" && typeof Blob !== "undefined") {
        return URL.createObjectURL(new Blob([code], { type: mime }));
    } else {
        return 'data:' + mime + ';' + 'base64' + ',' + Buffer.from(code).toString('base64');
    }
};

// manipulate memory by result wrapper
export class wrapresult {
    constructor(memory, results, threadID = 0){
        this.results = results;
        this.memory = memory;
        this.threadID = threadID;
    }

    address(threadID = 0) { return this.results[this.threadID+threadID]; };
    thread(threadID = 0) { return new this.constructor(this.memory, this.results, threadID); };
    get(threadID = 0) { return this.results[this.threadID+threadID]; };

    i8(threadID = 0) { return new Int8Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    u8(threadID = 0) { return new Uint8Array(this.memory.buffer, this.results[this.threadID+threadID]); }

    i16(threadID = 0) { return new Int16Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    u16(threadID = 0) { return new Uint16Array(this.memory.buffer, this.results[this.threadID+threadID]); }

    i32(threadID = 0) { return new Int32Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    u32(threadID = 0) { return new Uint32Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    f32(threadID = 0) { return new Float32Array(this.memory.buffer, this.results[this.threadID+threadID]); }

    i64(threadID = 0) { return new BigInt64Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    u64(threadID = 0) { return new BigUint64Array(this.memory.buffer, this.results[this.threadID+threadID]); }
    f64(threadID = 0) { return new Float64Array(this.memory.buffer, this.results[this.threadID+threadID]); }
};



export class program {
    constructor({
        assemblyCode = null
    }){
        this.assemblyCode = assemblyCode;
    }
};

export class device {
    constructor({
        threadCount = 4, 
        maxMemory = 65536,
        allocator = null
    }){
        this.commandCount = 0;
        this.barrierCount = 0;
        this.results = {};
        this.collectors = {};
        this.barriers = {};
        this.threadCount = threadCount;
        this.memory = new WebAssembly.Memory({ initial:256, maximum:Math.max(256,Math.ceil(maxMemory/65536)), shared: true });
        this.allocator_ = allocator;

        let driverURL = encodeDataURL(`
            (async()=>{
                let parentPort = typeof self != "undefined" ? self : null;
                let barriers = [];

                if (!parentPort) {
                    let WP = typeof require !== "undefined" ? require('worker_threads') : (await import('worker_threads'));
                    parentPort = global.parentPort = WP.parentPort;
                }

                let wasmResolve = null;
                let wasmReady = new Promise((resolve) => {
                    wasmResolve = resolve;
                });

                let threadInfo = {
                    id: 0
                };

                let execute = ({
                    type,
                    name,
                    id,
                    threadID,
                    args
                }) => {
                    
                    wasmReady.then((wasmInstance) => {
                        parentPort.postMessage({
                            type: "result",
                            result: wasmInstance[name].apply(null, [...args]),
                            threadID: threadID,
                            id: id
                        });
                    })
                    .catch((error) => {
                        parentPort.postMessage({ id: id, type: "error", error: error });
                    })
                };

                let initialize = ({
                    type,
                    id,
                    threadID,
                    memory,
                    assemblyCode
                })=>{
                    threadInfo.id = threadID;
                    WebAssembly.instantiate(assemblyCode, {
                        env: {
                            abort: function() { throw Error("abort called"); },
                            memory: memory,
                        },
                        index: {
                            "threadInfo.id": ()=>{
                                return threadInfo.id;
                            },
                            "threadInfo.synchronize": ()=>{
                                let done = false;

                                let resolveReject = {};
                                let promise = new Promise((resolve, reject)=>{
                                    resolveReject.resolve = resolve;
                                    resolveReject.reject = reject;
                                });
                                
                                // await sync
                                promise.then((result)=>{ done = true; });

                                // 
                                let id = barriers.length;
                                barriers.push(Object.assign(promise, resolveReject));
                                parentPort.postMessage({ id: id, type: "synchronize", result: null });

                                // await in thread
                                // webassembly doesn't support async or await
                                //let I = 0;
                                //while (!done) { I++; if (I >= 100000000) { console.error("Synchronization failed"); promise.reject("Synchronization failed"); break; }; };

                                console.error("Not supported operation");
                                return done;
                            }
                        }
                    })
                    .then(async (instantiatedModule) => {
                        wasmResolve(instantiatedModule.instance.exports);
                        parentPort.postMessage({ id: id, type: "initialized", result: null });
                    })
                    .catch((error) => {
                        parentPort.postMessage({ id: id, type: "error", error: error });
                    });
                };

                let synchronize = ({id})=>{ barriers[id].resolve(); };

                parentPort.addEventListener('message', function(event) {
                    if (event.data.type == "synchronize") { synchronize(event.data); };
                    if (event.data.type == "initialize") { initialize(event.data); };
                    if (event.data.type == "execute") { execute(event.data); };
                });
            })();
        `, "text/javascript");
        
        this.threads = [];

        let id = this.commandCount;
        for (let i=0;i<threadCount;i++) {
            let thread = new Worker(new URL(driverURL));
            
            thread.onmessage = (e) => {
                if (e.data.type == "synchronize") {

                    // 
                    if (this.barriers[e.data.id] == null) { this.barriers[e.data.id] = new Array(threadCount); };

                    // 
                    let resolveReject = {};
                    let promise = new Promise((resolve, reject)=>{
                        resolveReject.resolve = async (...args)=>{
                            //if (prevResult) { await prevResult; };
                            resolve(...args);
                        };
                        resolveReject.reject = async (...args)=>{
                            //if (prevResult) { await prevResult; };
                            reject(...args);
                        };
                    });
                    this.barriers[e.data.id][i] = Object.assign(promise, resolveReject);
                    if (this.barriers[e.data.id][i]) { this.barriers[e.data.id][i].resolve(); };

                    // 
                    let collected = 0;
                    for (let I=0;I<threadCount;I++) {
                        if (this.barriers[e.data.id][I]) { collected++; };
                    };

                    //
                    if (collected == threadCount) {
                        Promise.all(this.barriers[e.data.id]).then((result)=>{
                            for (let I=0;I<threadCount;I++) {
                                this.threads[I].postMessage({
                                    type: "synchronize",
                                    id: id,
                                    threadID: I
                                });
                            };
                        });
                    };

                    //this.barriers[id][i].resolve(e.data.result);
                } else 
                if (e.data.type == "initialized") {
                    this.results[e.data.id][i].resolve(e.data.result);
                } else 
                if (e.data.type == "result") {
                    this.results[e.data.id][i].resolve(e.data.result);
                } else 
                if (e.data.type == "error") {
                    this.results[e.data.id][i].reject(e.data.error);
                };
            };
            
            this.threads.push(thread);
        };
        
    }

    allocator(allocator) {
        this.allocator_ = allocator;
    }

    bindProgram_(program) {
        let prevResult = this.commandCount > 0 ? this.results[this.commandCount-1] : null;
        let id = this.commandCount++;
        this.results[id] = [];
        this.program = program;
        for (let i=0;i<this.threadCount;i++) {
            let clonedCode = program.assemblyCode.slice(0);
            let resolveReject = {};
            let promise = new Promise(async (resolve, reject)=>{
                resolveReject.resolve = async (...args)=>{
                    //if (prevResult) { await prevResult; };
                    resolve(...args);
                };
                resolveReject.reject = async (...args)=>{
                    //if (prevResult) { await prevResult; };
                    reject(...args);
                };
                if (prevResult) { await prevResult; };
            });
            this.results[id].push(Object.assign(promise, resolveReject));

            let exec = (previous)=>{
                this.threads[i].postMessage({
                    type: "initialize",
                    id: id,
                    threadID: i,
                    memory: this.memory,
                    assemblyCode: clonedCode,
                    previous: previous
                }, [clonedCode]);
            };
            if (prevResult) { prevResult.then(exec).catch((error)=>{ console.error(error); }); } else (exec());
        
        };
        return Promise.all(this.results[id]);
    }

    execute_(name = "main", args) {
        let prevResult = this.commandCount > 0 ? Promise.all(this.results[this.commandCount-1]) : null;
        let id = this.commandCount++;
        this.results[id] = [];
        for (let i=0;i<this.threadCount;i++) {
            let resolveReject = {};
            let promise = new Promise(async (resolve, reject)=>{
                resolveReject.resolve = async (...args)=>{
                    //if (prevResult) { await prevResult; };
                    resolve(...args);
                };
                resolveReject.reject = async (...args)=>{
                    //if (prevResult) { await prevResult; };
                    reject(...args);
                };
                // wait all results of command
                if (prevResult) { await prevResult; };
            });
            this.results[id].push(Object.assign(promise, resolveReject));

            let exec = (previous)=>{
                this.threads[i].postMessage({
                    type: "execute",
                    name: name,
                    id: id,
                    threadID: i,
                    args: args,
                    previous: previous
                });
            };
            if (prevResult) { prevResult.then(exec).catch((error)=>{ console.error(error); }); } else (exec());
            
        };
        return Promise.all(this.results[id]);
    }

    mem(address) {
        return new wrapresult(this.memory, (new Array(this.threadCount)).fill(address, 0, this.threadCount));
    }

    allocate(options) {
        return this.allocator_.allocate(options.byteSize);
    }

    async finish() {
        if (this.commandCount > 0) { return Promise.all(this.results[this.commandCount-1]); };
    }

    async execute(program, name = "main", args) {
        if (this.program != program) {
            await this.bindProgram_(program);
        };
        return new wrapresult(this.memory, await this.execute_(name, args));
    }
};

export async function wasmModule(device, code){
    return (await WebAssembly.instantiate(assemblyCode, {
        env: {
            abort: function() { throw Error("abort called"); },
            memory: device.memory
        }
    }));
};
