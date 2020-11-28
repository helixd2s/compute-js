// it is webassembly module "assembly"
module;

// TODO: rename "env" in WebAssembly code
#define IMPORTS env
#define NAME index

//
export module NAME;

// that "IMPORTS"
import IMPORTS;

// WARNING! C++ DOES NOT SUPPORT "export defaults"
// means "export NAME { ... }"
//export namespace NAME
//{

    // export as webassembly function (but it's crutch)
    //int add(int a, int b) asm("add");
    
    // means "export function(a, b)"
    // but should works without crutch
    export int add(int a, int b) {
        IMPORTS::console_i32(a);
        return a*a + b;
    }

//};

// means "export defaults", but not supported by C++20
//export using namespace NAME; // commented for C++ specification
