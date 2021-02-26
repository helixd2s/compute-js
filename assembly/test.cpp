// it is webassembly module "assembly"
module;

// TODO: rename "env" in WebAssembly code
#define ENV env
#define NAME add
#define EXPORT_NAME(n) __attribute__((export_name(n), visibility("default"))) 

// NOT working without standard library
//#include <emscripten/threading.h>

//
export module NAME;
import ENV;

// but it should to be 
#include "stdatomic.h"
#include "wasm_simd128.h"

// 
#ifdef ENABLE_PTHREADS
import <thread>;
import <execution>;
import <future>;
#endif

// 
export namespace NAME // For C++20 used
{

    

    // webassembly doesn't support export as object, only as export defaults (you can try rename as "index.add")
    int* threaded(int* buffer, int* indices) EXPORT_NAME("threaded") {
        intptr_t tip = thread_id();
        buffer[indices[tip]] = tip;
        return 0;
    }
    
};
