// it is webassembly module "assembly"
module;

// TODO: rename "env" in WebAssembly code into "imports"
#define NAME env

//
export module NAME;

// should be remedy by JavaScript
export namespace NAME {
    // crutch
    //extern int console_i32(const int value) asm("console_i32");
    //extern int console(const char* string, const int size) asm("console");
    
    // export external functions
    extern int console_i32(const int value);
    extern int console(const char* string, const int size);
};

// means "export defaults" (not prefer here)
//export using namespace NAME;
