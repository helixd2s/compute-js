::-emit-llvm -c -S 
clang++ ^
  --target=wasm32 -O3 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  -emit-llvm ^
  --precompile ^
  -c env.cppm ^
  -o env.pcm
clang++ ^
  --target=wasm32 -O3 ^
  -Xclang ^
  -std=c++20 ^
  -fmodules-ts ^
  -fmodules ^
  -emit-llvm ^
  -fmodule-file=env.pcm ^
  -c add.cppm ^
  -o add.o 
wasm-ld --no-entry --export-dynamic --allow-undefined --demangle --threads=6 -o add.wasm add.o
wasm2wat add.wasm -o add.wat
pause
