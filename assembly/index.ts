// The entry file of your WebAssembly module.
export function add(a: i32, b: i32): i32 {
  return a + b;
}

// 
declare namespace threadInfo {
  function id(): u32;
}

// executor (in C++ it harder)
export function main(buffer: usize, indices: usize): u32 {
  let tip: u32 = threadInfo.id();
  let ptr: usize = load<usize>(indices+tip*8);
  store<u32>(buffer+ptr, tip);
  return 0;
}
