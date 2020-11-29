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
    int* threaded(int threadId, int** managedMemory) EXPORT_NAME("threaded") {
        //managedMemory[threadId] = threadId;
        *(managedMemory[threadId]) = threadId;
        return managedMemory[threadId];
    }
    
    // это говно годиться только для монолитных приложений
#ifdef ENABLE_PTHREADS
    int* execute(uint32_t* managedMemory) EXPORT_NAME("execute") {
        //std::vector<int> results(6);
        int* results = allocate_int(6);
        std::vector<std::future<int>> resultsDefer = {};
        for (uint32_t t=0;t<6;t++) {
            resultsDefer.push_back(std::async([&]() {
                //results[t] = threaded(t, managedMemory);
                return threaded(t, managedMemory);
            }));
        }
        for (uint32_t t=0;t<6;t++) {
            results[t] = resultsDefer[t].get();
        }
        return results;
    }
#endif
    
    int add(atomic_int a, atomic_int b) EXPORT_NAME("add") {
        return atomic_fetch_add(&a, b);
    }
};
