
//import * as WT from 'worker_threads';

import { ThisExpression } from 'assemblyscript';

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


let encodeDataURL = (code, mime = "text/javascript") => {
    if (typeof URL !== "undefined" && typeof Blob !== "undefined") {
        return URL.createObjectURL(new Blob([code], { type: mime }));
    } else {
        return 'data:' + mime + ';' + 'base64' + ',' + Buffer.from(code).toString('base64');
    }
};

export class wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Uint8Array) {
        if (buffer.byteOffset != null) {
            address += buffer.byteOffset;
        };
        this.array = new (this.wrap = wrap)(buffer = buffer.buffer || buffer, parseInt(address));
        this.index = index;
    };

    // index manipulation
    assign(number, index=0) { this.array[this.index+index] = number; };
    set(number, index=0) { this.array[this.index+index] = number; };
    put(number, index=0) { this.array[this.index+index] = number; };
    get(index=0) { return this.array[this.index+index]; };
    idx(index=0) { return new this.constructor(this.array.buffer, this.array.byteOffset, index); };
    add(index=0) { return new this.constructor(this.array.buffer, this.array.byteOffset, this.index+index); };
    clone() { return new this.constructor(this.array.buffer, this.array.byteOffset, this.index); };

    // pointer manipulation
    get buffer() { return this.array.buffer; };
    get BYTES_PER_ELEMENT() { return this.array.BYTES_PER_ELEMENT; };
    get address() { return this.array.byteOffset + this.index*this.array.BYTES_PER_ELEMENT; };
    get value() { return this.array[this.index]; };
    set value(a) { this.array[this.index] = a; };

    // nodejs available only (with node-native library)
    get address() { return this.array.address(); };
};

export class u8ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Uint8Array){
        super(buffer, address, index, wrap);
    };
};

export class i8ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Int8Array){
        super(buffer, address, index, wrap);
    };
};

export class u16ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Uint16Array){
        super(buffer, address, index, wrap);
    };
};

export class i16ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Int16Array){
        super(buffer, address, index, wrap);
    };
};

export class u32ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Uint32Array){
        super(buffer, address, index, wrap);
    };
};

export class i32ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Int32Array){
        super(buffer, address, index, wrap);
    };
};

export class f32ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = Float32Array){
        super(buffer, address, index, wrap);
    };
};

export class u64ptr extends wrapptr {
    constructor(buffer, address = 0n, index = 0, wrap = BigUint64Array){
        super(buffer, address, index, wrap);
    };
};

export class i64ptr extends wrapptr {
    constructor(buffer, address = 0n){
        this.wrap = BigInt64Array;
        super(buffer, address);
    };
};

export class f64ptr extends wrapptr {
    constructor(buffer, address = 0n){
        this.wrap = Float64Array;
        super(buffer, address);
    };
};

// manipulate memory by result wrapper
export class wrapresult {
    constructor(memory, results, threadID = 0){
        this.results = results;
        this.memory = memory;
        this.threadID = threadID;
    }

    thread(threadID = 0) { return new this.constructor(this.memory, this.results, threadID); };
    get(threadID = 0) { return this.results[this.threadID+threadID]; };

    i8(threadID = 0) { return new i8ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    u8(threadID = 0) { return new u8ptr(this.memory.buffer, this.results[this.threadID+threadID]); }

    i16(threadID = 0) { return new i16ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    u16(threadID = 0) { return new u16ptr(this.memory.buffer, this.results[this.threadID+threadID]); }

    i32(threadID = 0) { return new i32ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    u32(threadID = 0) { return new u32ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    f32(threadID = 0) { return new f32ptr(this.memory.buffer, this.results[this.threadID+threadID]); }

    i64(threadID = 0) { return new i64ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    u64(threadID = 0) { return new u64ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
    f64(threadID = 0) { return new f64ptr(this.memory.buffer, this.results[this.threadID+threadID]); }
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
        this.results = {};
        this.threadCount = threadCount;
        this.memory = new WebAssembly.Memory({ initial:256, maximum:Math.max(256,Math.ceil(maxMemory/65536)), shared: true });
        this.allocator_ = allocator;

        let driverURL = encodeDataURL(`
            (async()=>{
                let parentPort = typeof self != "undefined" ? self : null;

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
                            value: wasmInstance[name].apply(null, [threadID, ...args]),
                            threadID: threadID,
                            id: id
                        });
                    })
                    .catch((error) => {
                        parentPort.postMessage({ id: id, type: "error", result: null });
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
                            }
                        }
                    }).then(async (instantiatedModule) => {
                        wasmResolve(instantiatedModule.instance.exports);
                        parentPort.postMessage({ type: "initialized" });
                    });
                };
                
                parentPort.addEventListener('message', function(event) {
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
                if (e.data.type == "result") {
                    this.results[e.data.id][i].resolve(e.data.value);
                } else 
                if (e.data.type == "error") {
                    this.results[e.data.id][i].reject(e.data.value);
                };
            };
            
            this.threads.push(thread);
        };
        
    }

    allocator(allocator) {
        this.allocator_ = allocator;
    }

    bindProgram_(program) {
        let clonedCode = program.assemblyCode.slice(0);
        let id = this.commandCount++;
        this.results[id] = [];
        this.program = program;
        for (let i=0;i<threadCount;i++) {
            let resolveReject = {};
            let promise = new Promise((resolve, reject)=>{
                resolveReject.resolve = resolve;
                resolveReject.reject = reject;
            });
            this.results[id].push(Object.assign(promise, resolveReject));
            this.threads[i].postMessage({
                type: "initialize",
                id: id,
                threadID: i,
                memory: this.memory,
                assemblyCode: clonedCode
            }, [clonedCode]);
        };
        return Promise.all(this.results[id]);
    }

    execute_(name = "main", ...args) {
        let id = this.commandCount++;
        this.results[id] = [];
        for (let i=0;i<this.threadCount;i++) {
            let resolveReject = {};
            let promise = new Promise((resolve, reject)=>{
                resolveReject.resolve = resolve;
                resolveReject.reject = reject;
            });
            this.results[id].push(Object.assign(promise, resolveReject));
            this.threads[i].postMessage({
                type: "execute",
                name: name,
                id: id,
                threadID: i,
                args: args
            });
        };
        return Promise.all(this.results[id]);
    }

    mem(address) {
        return new wrapresult(this.memory, (new Array(this.threadCount)).fill(address, 0, this.threadCount));
    }

    allocate(options) {
        return this.allocator_.allocate(options.byteSize);
    }

    async execute(program, name = "main", args) {
        await Promise.all(this.results[this.commandCount-1]); // wait queue
        if (this.program != program) {
            await this.bindProgram_(program);
            await Promise.all(this.results[this.commandCount-1]); // wait queue
        };
        return new wrapresult(this.memory, await this.execute_(name, ...args));
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
