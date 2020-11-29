::-emit-llvm -c -S 
call clang++ ^
  --target=wasm32 -O3 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  --precompile ^
  -x c++-module ^
  -nostdlib ^
  -c ./env.cpp ^
  -o ./env.pcm
call clang++ ^
  --target=wasm32 -O3 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  -x c++-module ^
  -fprebuilt-module-path=. ^
  -nostdlib ^
  -Wl,--no-entry -Wl,--export-dynamic -Wl,--allow-undefined -Wl,--demangle ^
     ./test.cpp ^
  -o ./test.js
::call wasm-ld --no-entry --export-dynamic --allow-undefined --demangle --threads=6 -o test.wasm test.o
call wasm2wat test.wasm -o test.wat --enable-threads 
pause
