// The entry file of your WebAssembly module.
export function add(a: i32, b: i32): i32 {
  return a + b;
}

// 
declare namespace threadInfo {
  function id(): u32;
  function synchronize(): bool;
}

// executor (in C++ it harder)
export function main(buffer: usize, offsets: usize): u32 {
  let tip: u32 = threadInfo.id();
  let ptr: usize = load<usize>(offsets+tip*8);
  let iptr: usize = load<usize>(offsets+(5-tip)*8);

  // 
  store<u32>(buffer+ptr, tip);
  threadInfo.synchronize();
  //atomic.fence();

  // read 
  let val = load<u32>(buffer+iptr);
  threadInfo.synchronize();
  //atomic.fence();

  // sum
  store<u32>(buffer+ptr, val+tip);

  return 0;
  //return buffer+ptr;
}
