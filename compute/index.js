
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


function bitCount (n) {
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

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
        this.threadCount = threadCount;
        this.memory = new WebAssembly.Memory({ initial:256, maximum:Math.max(256,Math.ceil(maxMemory/65536)), shared: true });
        this.allocator_ = allocator;
        this.syncLock = new SharedArrayBuffer(threadCount*4);
        this.mutexLock = new SharedArrayBuffer(threadCount*4);

        let sysLock = new Int32Array(this.syncLock);
        for (let i=0;i<this.threadCount;i++) {
            sysLock[i] = 0;
        }

        let driverURL = encodeDataURL(`
            (async()=>{
                let parentPort = typeof self != "undefined" ? self : null;
                let syncLock = null;
                let mutexLock = null;
                let barrierCount = 0;

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


                function bitCount (n) {
                    n = n - ((n >> 1) & 0x55555555)
                    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
                    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
                }

                let initialize = ({
                    type,
                    id,
                    threadID,
                    memory,
                    assemblyCode,
                    syncLockAB,
                    mutexLockAB
                })=>{
                    syncLock = new Int32Array(syncLockAB);
                    mutexLock = new Int32Array(mutexLockAB);

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
                                let resolveReject = {};
                                let promise = new Promise((resolve, reject)=>{
                                    resolveReject.resolve = resolve;
                                    resolveReject.reject = reject;
                                });
                                
                                // await sync
                                let done = false;

                                // 
                                let threadCount = 6;
                                let mask = (1<<threadInfo.id)|Atomics.or(syncLock, 0, 1<<threadInfo.id);

                                // tell to host thread to synchronize workers 
                                parentPort.postMessage({ id: barrierCount++, type: "synchronize", result: mask });

                                // await ready marks
                                for (let i=0;i<100000000;i++) {
                                    if (Atomics.compareExchange(mutexLock, threadInfo.id, 1, 0) == 1) {
                                        done = true; break;
                                    }
                                }

                                if (!done) { console.error("Synchronization failed"); };
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
                    let sysLock = new Int32Array(this.syncLock);
                    let mutLock = new Int32Array(this.mutexLock);

                    // 
                    if (Atomics.compareExchange(sysLock, 0, (1<<threadCount)-1, 0) == (1<<threadCount)-1) {
                        for (let I=0;I<threadCount;I++) {
                            Atomics.compareExchange(mutLock, I, 0, 1);
                        };
                    };

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
                    syncLockAB: this.syncLock,
                    mutexLockAB: this.mutexLock,
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
