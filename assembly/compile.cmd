::-emit-llvm -c -S 
call em++ ^
  --target=wasm32 -O2 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  -emit-llvm ^
  --precompile ^
  -x c++-module ^
  -s USE_PTHREADS=1 -lpthread ^
  -nostdlib ^
  -D__EMSCRIPTEN__ ^
  -c ./env.cpp ^
  -o ./env.pcm
call em++ ^
  --target=wasm32 -O2 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  -emit-llvm -x c++-module ^
  -fprebuilt-module-path=. ^
  -s USE_PTHREADS=1 -lpthread ^
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 ^
  -nostdlib ^
  -D__EMSCRIPTEN__ ^
  -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Wl,--demangle ^
     ./test.cpp ^
  -o ./test.js
::call wasm-ld --no-entry --export-dynamic --allow-undefined --demangle --threads=6 -o test.wasm test.o
call wasm2wat test.wasm -o test.wat --enable-threads 
pause
