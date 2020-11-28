// it is webassembly module "assembly"
module;

// TODO: rename "env" in WebAssembly code
#define ENV env
#define NAME index
#define EXPORT_NAME(n) __attribute__((export_name(n), visibility("default")))

//
export module NAME;
import ENV;

// 
export namespace NAME // For C++20 used
{
    // webassembly doesn't support export as object, only as export defaults (you can try rename as "index.add")
    int add(int a, int b) EXPORT_NAME("add") {
        ENV::console_i32(a);
        return a*a + b;
    }
};
