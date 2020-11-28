// it is webassembly module "assembly"
module;

// TODO: rename "env" in WebAssembly code into "imports"
#define STR(x) #x
#define NAME env
#define IMPORT_NAME(n) __attribute__((import_name(n), import_module("env"), visibility("default")))

//
export module NAME;

// 
export namespace NAME // For C++20 
{
    // 
    extern int console_i32(const int value) IMPORT_NAME("console_i32");
    extern int console(const char* string, const int size) IMPORT_NAME("console");
};
